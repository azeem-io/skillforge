# Build, test and deploy

How a change gets from a branch to the running system. There is no hosted
pipeline yet — these are the gates, run locally and reproducible in CI. The
problem statement asks for this documentation; an automated pipeline is a bonus
on top of it.

## The gates

Run all four before opening a pull request. Nothing here needs the stack running
except the migration check.

| Gate | Command | Covers |
|---|---|---|
| Types | `bun run typecheck` | Every workspace, TypeScript strict |
| Analyzer tests | `cd python-analyzer && pytest` | 37 tests — graph, gaps, layering, scoring |
| AI tests | `cd ai-service && pytest` | 33 tests — retrieval, chunking, agent tool loop |
| Compose validity | `docker compose config -q` | Interpolation and schema, without building |

The Python suites need no API key: the agent tests stub the DeepSeek client, and
the knowledge tests embed a fixture corpus rather than the real one.

## Building images

**Every image builds from the repo root**, never from its own directory:

```bash
docker build -f ai-service/Dockerfile .
```

`ai-service/Dockerfile` copies `rag/knowledge-base/`, which lives outside its own
directory, so a narrower build context breaks it. The root `.dockerignore` is the
only one that applies — it excludes `*.md` but re-includes
`rag/knowledge-base/**/*.md`. Drop that negation and ai-service builds fine and
answers nothing.

Two images build in two runtimes on purpose. Bun installs dependencies (it is the
only thing that reads `bun.lock`), Node builds and serves the frontend, because
`next build` segfaults on the Bun runtime. Both `frontend/Dockerfile` and
`docker/migrate.Dockerfile` install with `--linker=hoisted`; Bun's default
isolated layout defeats Next's file tracer and produces a standalone output
missing `@swc/helpers`, which fails at container start rather than at build.

Tags come from `IMAGE_PREFIX` and `IMAGE_TAG`, defaulting to
`skillforge/<service>:local`. `docker compose up` must be passed `--build` —
without it Compose tries to *pull* those tags from Docker Hub, where they do not
exist. `bun run up` already passes it.

## Migrations

`migrate` is a one-shot container that runs to completion and exits before any
service starts:

```yaml
migrate:
  restart: "no"
  depends_on:
    postgres: { condition: service_healthy }
```

`restart: "no"` is load-bearing. A restart policy on a one-shot job turns a
failed migration into a crash loop that never surfaces as a failed deploy — the
stack looks like it is starting rather than like it is broken.

Every service that touches the database waits on
`migrate: { condition: service_completed_successfully }`, so a failed migration
stops the deploy instead of letting services start against an old schema.

Seeding runs in the same container when `SEED_ON_START` is true, which is the
default. It is idempotent — every insert upserts on a natural key — so re-running
updates the catalogue rather than duplicating it. Set it false once the taxonomy
is stable.

## Deploying

`docker-compose.yml` is both local development and production. The deploy is the
same file with a different `.env`, which is what keeps "works locally" meaningful.

```bash
git pull && docker compose up -d --build
```

Health checks gate the rollout: every service defines one, and `depends_on`
conditions mean the gateway will not start until auth, profile and skill services
are healthy. `scripts/setup.sh` waits on each in turn and reports which one
failed rather than leaving a half-started stack.

`ai-service` has a 60s `start_period` because it embeds the knowledge base at
boot so the first question does not pay for it. A shorter budget marks it
unhealthy while it is doing exactly what it should.

Rollback is `IMAGE_TAG` — build tagged images rather than `:local` and a previous
tag is one variable away. The database is not rolled back with them; migrations
are forward-only.

## The pipeline

`.github/workflows/ci.yml` runs the four gates on every push and pull request,
as three parallel jobs: TypeScript, the two Python suites (a matrix), and
`docker compose --profile edge config -q` with placeholder values. It needs no
secrets — the Python tests stub DeepSeek and compose is validated, not started.

Deploys are not a workflow step. Coolify's GitHub app redeploys on every push to
`main`, building on the VPS itself (12 GB — the Next build is the heavy part).
Secrets live in Coolify's environment, nowhere in GitHub. The full click path is
in `docs/deploy.md`; `scripts/prod-env.sh <domain>` prints the environment to
paste.

CI reports next to the commit but does not gate the deploy — a red check and a
successful deploy can coexist. Tightening that means moving the build into
Actions and letting Coolify pull a tagged image (`IMAGE_PREFIX`/`IMAGE_TAG` are
already wired into the compose file for it), which is the next step if a broken
push ever reaches the box.
