#!/usr/bin/env bash
# One command from a fresh clone to a running system. Safe to re-run: every
# step checks before it acts.
#
#   ./scripts/setup.sh          docker compose, the way it is deployed
#   ./scripts/setup.sh --local  bun on the host, Postgres in a container

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
MODE="${1:-compose}"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is not installed. $2"
}

bold "Checking prerequisites"
need docker "Install Docker: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "The docker compose plugin is missing."
ok "docker $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '(daemon not reachable)')"
if [ "$MODE" = "--local" ]; then
  need bun "Install Bun: https://bun.sh"
  ok "bun $(bun --version)"
  need python3 "Install Python 3: https://www.python.org/downloads/"
  ok "python3 $(python3 --version | cut -d' ' -f2)"
  need curl "Install curl."
fi

bold "Environment"
if [ ! -f .env ]; then
  cp .env.example .env
  # Generated rather than copied: the placeholders in .env.example are not
  # secrets, and a deploy that ships with them is a deploy with no secrets.
  if command -v openssl >/dev/null 2>&1; then
    auth_secret=$(openssl rand -base64 32)
    gateway_secret=$(openssl rand -hex 32)
    postgres_password=$(openssl rand -hex 16)
    sed -i.bak \
      -e "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${auth_secret}|" \
      -e "s|^GATEWAY_SECRET=.*|GATEWAY_SECRET=${gateway_secret}|" \
      -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${postgres_password}|" \
      -e "s|^DATABASE_URL=postgres://\([^:]*\):[^@]*@|DATABASE_URL=postgres://\1:${postgres_password}@|" \
      .env
    rm -f .env.bak
    ok ".env created with generated secrets"
  else
    warn ".env created from the example — openssl is missing, so fill in the secrets by hand"
  fi
else
  ok ".env already exists, leaving it alone"
fi

# Next.js only reads env files from its own directory, so the frontend needs
# its own copy for local dev. Not used by the container, which gets its
# environment from compose.
if [ ! -f frontend/.env.local ]; then
  cp .env frontend/.env.local
  ok "frontend/.env.local created"
fi

mkdir -p "${UPLOAD_DIR:-/tmp/skillforge-uploads}"
ok "upload directory ready"

if [ "$MODE" = "--local" ]; then
  bold "Installing dependencies"
  # From the root, never inside a workspace — bun.lock covers the whole tree.
  bun install
  ok "dependencies installed"

  bold "Starting Postgres"
  # DATABASE_URL is the source of truth for local dev (bun scripts read it
  # directly, not the POSTGRES_* parts) — derive the port and password from
  # it so the container we start or reuse actually matches what migrate/seed
  # will connect to.
  db_url=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)
  # -n plus p, not a bare s///: a URL with no port does not match, and a bare
  # s/// passes its input through, which would set pg_port to the whole URL.
  pg_port=$(printf '%s' "$db_url" | sed -nE 's#.*:([0-9]+)/[^/?]*([?].*)?$#\1#p')
  pg_port=${pg_port:-5432}
  pg_password=$(grep -E '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
  # Only as a fallback: a password inside the URL is percent-encoded, and the
  # container needs the decoded byte string.
  pg_password=${pg_password:-$(printf '%s' "$db_url" | sed -nE 's#^[^:]+://[^:/@]+:([^@]*)@.*#\1#p')}

  if [ -z "$(docker ps -q -f name=^skillforge-postgres$)" ]; then
    if [ -n "$(docker ps -aq -f name=^skillforge-postgres$)" ]; then
      docker start skillforge-postgres >/dev/null
      ok "existing skillforge-postgres container started"
    else
      docker run -d --name skillforge-postgres \
        -e POSTGRES_USER=skillforge \
        -e POSTGRES_PASSWORD="${pg_password:-dev}" \
        -e POSTGRES_DB=skillforge \
        -p "${pg_port}:5432" \
        pgvector/pgvector:pg17 >/dev/null
      ok "skillforge-postgres started on :${pg_port}"
    fi
  else
    ok "skillforge-postgres already running"
  fi

  # A container left over from an earlier run (or a manual workaround for a
  # port clash with something unrelated on this host) can be bound to a
  # different host port than DATABASE_URL expects. That mismatch otherwise
  # surfaces three steps later as an opaque 28P01 from whatever else is
  # squatting on the expected port, instead of from this database at all.
  actual_port=$(docker port skillforge-postgres 5432/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' | head -1)
  if [ -n "$actual_port" ] && [ "$actual_port" != "$pg_port" ]; then
    die "skillforge-postgres is published on :${actual_port} but DATABASE_URL in .env points at :${pg_port}. Update DATABASE_URL's port in .env (and frontend/.env.local) to ${actual_port}, or 'docker rm -f skillforge-postgres' and re-run to recreate it on :${pg_port}."
  fi

  # Same failure shape as the port check, one step later: a container created
  # from an older .env keeps its original password, and the regenerated one in
  # DATABASE_URL then fails as a bare 28P01 from migrate.
  actual_password=$(docker inspect skillforge-postgres \
    --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
    | sed -nE 's/^POSTGRES_PASSWORD=(.*)$/\1/p' | head -1)
  if [ -n "$actual_password" ] && [ "$actual_password" != "$pg_password" ]; then
    die "skillforge-postgres was created with a different password than DATABASE_URL in .env carries. Either restore the old password in .env (and frontend/.env.local), or 'docker rm -f skillforge-postgres' and re-run to recreate it — that drops the existing database."
  fi

  printf '  waiting for Postgres'
  for _ in $(seq 1 30); do
    if docker exec skillforge-postgres pg_isready -U skillforge -d skillforge >/dev/null 2>&1; then
      printf '\n'; ok "Postgres accepting connections"; break
    fi
    printf '.'; sleep 1
  done

  bold "Database"
  bun run db:migrate
  bun run db:seed

  bold "Python services"
  # ai-service and python-analyzer are FastAPI, not part of the bun workspace,
  # so `bun run dev:services` never touches them — without this step they just
  # aren't running locally, and anything that calls them (the assistant, the
  # roadmap) fails with a connection error, not an obviously-related one.
  run_dir="$ROOT/.run"
  mkdir -p "$run_dir"

  # fastembed defaults its cache to $TMPDIR/fastembed_cache, so every reboot
  # re-downloads the embedding model. The Dockerfile pins it to /opt/fastembed;
  # this is the host equivalent.
  export FASTEMBED_CACHE_PATH="${FASTEMBED_CACHE_PATH:-${XDG_CACHE_HOME:-$HOME/.cache}/fastembed}"

  start_python_service() {
    local name="$1" dir="$2" port="$3" wait_secs="${4:-60}" prewarm="${5:-}"
    if curl -sf --max-time 1 "http://localhost:${port}/health" >/dev/null 2>&1; then
      ok "$name already running on :${port}"
      return
    fi
    if [ ! -d "$dir/.venv" ]; then
      python3 -m venv "$dir/.venv"
    fi
    "$dir/.venv/bin/pip" install -q -r "$dir/requirements.txt"
    # Before the health clock starts, not inside startup: a cold model download
    # is slower than any health timeout worth waiting on.
    if [ -n "$prewarm" ]; then
      printf '  fetching the embedding model for %s (first run only)\n' "$name"
      ( set -a; source "$ROOT/.env"; set +a; "$dir/.venv/bin/python" -c "$prewarm" ) \
        || die "$name could not fetch its embedding model — needs huggingface.co"
    fi
    (
      cd "$dir"
      set -a; source "$ROOT/.env"; set +a
      # Only ai-service reads this; python-analyzer ignores it. The Dockerfile
      # default (/app/knowledge-base) doesn't exist on the host.
      export KNOWLEDGE_BASE_PATH="$ROOT/rag/knowledge-base"
      nohup "$dir/.venv/bin/uvicorn" main:app --port "$port" \
        >"$run_dir/${name}.log" 2>&1 &
      echo $! >"$run_dir/${name}.pid"
    )
    printf '  waiting for %s' "$name"
    for _ in $(seq 1 "$wait_secs"); do
      if curl -sf --max-time 1 "http://localhost:${port}/health" >/dev/null 2>&1; then
        printf '\n'; ok "$name started on :${port}"; return
      fi
      if ! kill -0 "$(cat "$run_dir/${name}.pid")" 2>/dev/null; then
        printf '\n'
        die "$name exited during startup — see $run_dir/${name}.log"
      fi
      printf '.'; sleep 1
    done
    printf '\n'
    die "$name did not become healthy on :${port} — see $run_dir/${name}.log"
  }

  # python-analyzer first: ai-service's own tools call it for gaps/roadmaps.
  start_python_service python-analyzer "$ROOT/python-analyzer" 8085
  # ai-service embeds the whole knowledge base at boot before it opens the
  # port (see its README), which is ~75s for the current corpus on a laptop —
  # the compose healthcheck gives it a 60s start period on a *warm* image for
  # the same reason. The prewarm keeps a cold model download out of that
  # window; the rest is the embedding itself, so the budget is generous. A
  # service that dies is caught by the pid check, not by this number.
  start_python_service ai-service "$ROOT/ai-service" 8084 300 \
    "import os; from fastembed import TextEmbedding; TextEmbedding(model_name=os.environ.get('EMBEDDING_MODEL', 'BAAI/bge-small-en-v1.5'))"

  bold "Ready"
  cat <<MSG
  ai-service and python-analyzer are running in the background (logs and pid
  files under .run/). Stop them with:

    kill \$(cat .run/ai-service.pid) \$(cat .run/python-analyzer.pid)

  Start everything else with four terminals, or one:

    bun run dev:services   # auth, gateway, profile, skills
    bun run dev            # the frontend on :3000

MSG
  exit 0
fi

bold "Building images"
docker compose build
ok "images built"

bold "Starting the stack"
docker compose up -d
ok "containers started"

bold "Waiting for health"
for service in postgres python-analyzer ai-service auth-service profile-api skill-service api-gateway frontend; do
  printf '  %-14s' "$service"
  for _ in $(seq 1 60); do
    status=$(docker compose ps --format json "$service" 2>/dev/null \
      | sed -n 's/.*"Health":"\([a-z]*\)".*/\1/p' | head -1)
    state=$(docker compose ps --format json "$service" 2>/dev/null \
      | sed -n 's/.*"State":"\([a-z]*\)".*/\1/p' | head -1)
    if [ "$status" = "healthy" ] || { [ -z "$status" ] && [ "$state" = "running" ]; }; then
      printf '\033[32mhealthy\033[0m\n'; break
    fi
    if [ "$state" = "exited" ]; then printf '\033[31mexited\033[0m\n'; break; fi
    printf '.'; sleep 2
  done
done

bold "Ready"
cat <<MSG
  http://localhost:3000                    the app
  http://localhost:3000/api/skills/roles   through the gateway

  Need HTTPS on this box (no Coolify in front)? Add Caddy with
    docker compose --profile edge up -d
  It signs for localhost with its own CA, so expect one browser warning.

  docker compose logs -f <service>    follow a service
  docker compose down                stop, keeping the database volume
MSG
