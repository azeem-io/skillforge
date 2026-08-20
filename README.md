# SkillForge

AI-powered student skills and career development platform. Assess what you know,
see the gap to the role you want, and get a roadmap that respects prerequisites.

Read `CLAUDE.md` before writing code — stack rules, architecture, ownership.

## Quick start

```bash
git clone <repo> && cd skillforge
./scripts/setup.sh
```

That generates `.env` with fresh secrets, builds the images, starts the stack and
waits for every health check. Then open <https://localhost>.

Caddy issues its own certificate for `localhost`, so the first visit shows a
browser warning — that is the internal CA, not a misconfiguration.

### Local development instead

Services on the host with Bun, Postgres in a container:

```bash
./scripts/setup.sh --local
bun run dev:services   # auth, gateway, profile, skills
bun run dev            # the frontend on :3000
```

## Prerequisites

- Docker with the Compose plugin
- [Bun](https://bun.sh) — only for the `--local` path

## What runs

| Service | Port | Owns |
|---|---|---|
| `frontend` | 3000 | Next.js 16 UI. Calls the gateway, never a service |
| `api-gateway` | 8080 | Routing, session verification, forwarding identity |
| `auth-service` | 8081 | Better Auth, argon2id, users/sessions/roles |
| `profile-api` | 8082 | Profile, skills, projects, certifications, uploads |
| `skill-service` | 8083 | Taxonomy, assessments, FSRS progress, roadmaps |
| `ai-service` | 8084 | DeepSeek, RAG, the agent — **not built yet** |
| `python-analyzer` | 8085 | SkillAnalyzer, gap calculation — **not built yet** |
| `postgres` | — | PostgreSQL 17 + pgvector. Never published |
| `caddy` | 80/443 | TLS, and the only container that publishes ports |

The two unbuilt services are routed at anyway: the gateway answers 502 for them,
and the roadmap falls back to a local topological layering rather than failing.

## Scripts

| Command | Does |
|---|---|
| `./scripts/setup.sh` | Fresh clone to running stack |
| `bun run up` / `bun run down` | Start / stop compose |
| `bun run dev` | Frontend only (`next dev`) |
| `bun run dev:services` | The four backend services with watch |
| `bun run db:generate` | Generate a Drizzle migration from the schema |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed taxonomy, roles, resources and assessments |
| `bun run db:studio` | Drizzle Studio |
| `bun run typecheck` | Typecheck every workspace |

## Try it

1. Register at `/register` — passwords are at least 12 characters, hashed with
   argon2id.
2. Set a target role on `/profile`. That is what everything measures against.
3. Take an assessment at `/assessments`. Six areas, ten questions each.
4. The result scores **per skill**, writes your proficiency levels and starts a
   spaced-repetition schedule for each one.
5. `/graph` and `/roadmap` now reflect what you actually demonstrated.

## Docs

- `CLAUDE.md` — stack, hard rules, architecture, ownership
- `docs/architecture.md` — services, request path, how identity travels
- `docs/api.md` — every endpoint, and the python-analyzer contract
- `docs/schema.md` — the data model, with ER diagrams
- `docs/decisions.md` — settled decisions and why; read before re-proposing

## Deployment

`docker-compose.yml` is both local development and production, deployed with
Coolify on a Contabo VPS.

- `kubernetes/` — the same system as Deployments and Services, validated with
  `kubeconform -strict` against Kubernetes 1.31 schemas
- `terraform/` — provisions or adopts the Contabo VPS, with cloud-init
  installing Docker and Coolify
