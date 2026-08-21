#!/usr/bin/env bash
# Grants a role to an existing account. Everyone registers as a student, so the
# first admin has to be made from outside the app — after that an admin can
# promote anyone from the roster.
#
#   ./scripts/promote.sh you@example.com admin
#   ./scripts/promote.sh mentor@example.com mentor
#
# Reads the database name and user from inside the postgres container, so it
# works wherever the stack runs — a local checkout or a Coolify deployment that
# has no .env on disk. Point it at another compose project with
# COMPOSE_PROJECT_NAME.

set -euo pipefail

EMAIL="${1:-}"
ROLE="${2:-admin}"

if [ -z "$EMAIL" ]; then
  echo "usage: $0 <email> [student|mentor|admin]" >&2
  exit 1
fi

case "$ROLE" in
  student|mentor|admin) ;;
  *) echo "role must be student, mentor or admin" >&2; exit 1 ;;
esac

# POSTGRES_CONTAINER targets a container by name — Coolify names its compose
# projects by UUID, so `docker compose exec` from the checkout does not resolve.
#   POSTGRES_CONTAINER=$(docker ps -qf name=postgres) ./scripts/promote.sh you@x admin
if [ -n "${POSTGRES_CONTAINER:-}" ]; then
  run() { docker exec -i "$POSTGRES_CONTAINER" "$@"; }
else
  run() { docker compose exec -T postgres "$@"; }
fi

# The SQL is built in the shell with a quoted heredoc so neither bash nor the
# container shell re-expands it; $POSTGRES_* are read inside the container.
sql=$(cat <<SQL
update users set role = '${ROLE}' where email = '${EMAIL//\'/\'\'}' returning email;
SQL
)
updated=$(printf '%s' "$sql" | run sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -qtA')

if [ -z "$updated" ]; then
  echo "no account with email $EMAIL — register in the app first" >&2
  exit 1
fi

echo "$EMAIL is now $ROLE"
