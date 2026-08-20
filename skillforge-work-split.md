# Work split

Two people, two agents, one repo. This file says who owns what, what already
exists, and which files will conflict. Read it with `AGENTS.md` before starting
a task.

Owners are **A** (Azeem) and **P** (partner). If you are P's agent, everything
marked P is available. Ask before starting anything marked A.

## Current state

Built and committed:

- `packages/db` — 26 tables, migration generated and verified against Postgres 17
- `frontend` — Next 16, Tailwind v4, shadcn (radix-nova), the theme tokens
- `frontend/app/(app)` — shell, `/dashboard`, `/graph`, `/roadmap`, plus stubs
- `AGENTS.md`, `docs/decisions.md`, `.claude/skills/`

Does not exist yet: `backend/`, `ai-service/`, `python-analyzer/`, `rag/`,
`kubernetes/`, `terraform/`, `scripts/`, `docker-compose.yml`, `.env.example`.

All frontend data is mock (`frontend/lib/mock.ts`). Shapes match `packages/db`,
so replacing it is a query swap, not a refactor.

## Before writing code

- **npm, not Bun.** `npm install` from the repo root. Never inside a workspace
  folder — it breaks hoisting.
- **Tailwind only.** No CSS Modules anywhere. When porting a component from
  Retention Lab, keep the TSX logic and props, discard the `.module.css`.
- Read `.claude/skills/ui-component/SKILL.md` before any UI work and
  `.claude/skills/add-service/SKILL.md` before adding a service.

## P — backend services

New directories. No collision with A.

| Task | Path | Notes |
|---|---|---|
| Auth service | `backend/auth-service/` | Better Auth + argon2id + 3 roles. Schema is already written in `packages/db/src/schema/auth.ts` — do not regenerate it, it has three hand-applied edits documented in the file |
| API gateway | `backend/api-gateway/` | Verifies session once, forwards identity as headers. Prefixes: `/api/auth/*`, `/api/profile/*`, `/api/skills/*`, `/api/analysis/*`, `/api/ai/*` |
| Profile API | `backend/profile-api/` | Profile, projects, certifications, uploads |
| Skill service | `backend/skill-service/` | Taxonomy reads, assessments, progress, roadmap persistence |

Service names match the requirements PDF diagram. Do not rename them.

Retention Lab's `src/db/queries/*`, `src/lib/scheduler.ts`,
`src/lib/review-session.ts` and `src/lib/password.ts` have zero Next or React
imports and lift into these services almost verbatim.

## P — DevOps

New files. No collision with A. Highest rubric value per hour.

| Task | Path | Notes |
|---|---|---|
| Compose + Dockerfiles | `docker-compose.yml`, `docker/` | Postgres **must** be `pgvector/pgvector:pg17` — the AI service needs vector search |
| Kubernetes | `kubernetes/` | Deployment + Service per service. Validate with `kubectl apply --dry-run=client -f`. Cluster deploy optional, correct manifests are not |
| Terraform | `terraform/` | Basic IaC. Apply optional |
| Setup script | `scripts/setup.sh` | Install deps, create dirs, start services, print status |
| Env template | `.env.example` | **Does not exist yet and both sides need it. Do this first.** |
| Deploy | Coolify on the existing VPS | Compose is both local dev and production |

## P — frontend

| Task | Path | Collision |
|---|---|---|
| Assessment UI | `app/(app)/assessments/`, `components/assessment/` | Low — replaces a 10-line stub |
| Profile UI | `app/(app)/profile/` | Low — same |
| Auth pages | `app/login/`, `app/register/` | None |
| FSRS wiring | `backend/skill-service/` | None. Note `skill_state` is keyed on `(userId, skillId)`, not on cards |

Build assessment result cards as standalone components under
`components/assessment/`. A will import them into the dashboard. That keeps both
of us out of `dashboard/page.tsx` at the same time.

## P — submission docs

`docs/` — API documentation, architecture diagram, database schema diagram. All
three are explicit PDF deliverables.

## A — do not start these

`frontend/components/graph/*`, `frontend/lib/mock.ts`,
`frontend/lib/mastery.ts`, `frontend/app/globals.css`,
`app/(app)/graph/`, `app/(app)/roadmap/`, `app/(app)/tree/`,
`python-analyzer/`, `ai-service/`, `rag/`.

## Conflict map

| File | Risk | Resolution |
|---|---|---|
| `package-lock.json`, `package.json` | **High** | Do not hand-merge. Delete your copy, `npm install` from root, commit the regenerated file |
| `packages/db/src/schema/*` | **Medium** | Announce first. Follow `.claude/skills/db-change/SKILL.md` — it has a Docker verification loop, because typechecking will not catch an invalid check constraint |
| `frontend/components/layout/app-sidebar.tsx` | **Medium** | Both sides add nav entries. Small file, resolve by keeping both |
| `frontend/app/(app)/dashboard/page.tsx` | **Medium** | Avoided by the standalone-component convention above |
| `.env.example` | **Low** | Additive. Add a variable in the same commit as the code that reads it |
| `AGENTS.md`, `docs/decisions.md` | **Low** | Append, do not restructure |

## Branching

`main` is the integration branch. Work on `feature/<name>` and merge in. Commit
messages are one line, no body, no co-author trailer.
