# Contributing

AI-powered student skills and career development platform. Hackathon project,
2-person team. Read this before writing any code — the rules below are the ones
that are load-bearing, not preferences.

## Running it

```bash
./scripts/setup.sh          # generates .env, builds images, starts everything
bun run up                  # docker compose up -d --build
bun run down
```

Then **http://localhost:3000**. Caddy is opt-in (`bun run up:edge`) because
in production Coolify's own proxy terminates TLS; locally it serves
`https://localhost` with a self-signed certificate if you want it.

Deploying: `docs/deploy.md`. CI: `.github/workflows/ci.yml`, the gates from
`docs/cicd.md`. Production env: `./scripts/prod-env.sh <domain>`.

`bun run up` passes `--build`. Without it Compose tries to *pull*
`skillforge/*:local` from Docker Hub and fails; these images only exist locally.

Everyone registers as a student. The first admin is made from outside the app:

```bash
./scripts/promote.sh you@example.com admin
```

## Stack — do not substitute

- **Bun.** `bun install` from the repo root, never inside a workspace folder.
  Lockfile is `bun.lock`. Bun runs TypeScript natively, so scripts need no flags.
- **Next runs on Node, not the Bun runtime.** `next build` segfaults under Bun
  1.3.14, so the frontend scripts are plain `next dev` / `next build`. Bun is
  the package manager and script runner only.
- **Next.js 16** App Router, React 19, TypeScript strict, Turbopack
- **Tailwind v4** CSS-first, no config file. **No CSS Modules.** No other CSS
  system anywhere in the repo.
- **Hono on Bun** for the four Node services
- **PostgreSQL 17 + pgvector**, Drizzle ORM, migrations checked in
- **Better Auth** with argon2id, database sessions
- **FastAPI** for the two Python services
- **DeepSeek** for all LLM calls (OpenAI-compatible SDK, `base_url` swapped)
- **fastembed** for embeddings — DeepSeek has no embeddings endpoint
- **Docker Compose** is both local dev and production. Deployed via Coolify,
  whose proxy fronts the stack — Caddy only runs under the `edge` profile.

## Hard rules

- No hardcoded colours. Every colour comes from a token in
  `frontend/app/globals.css`. If a value is missing, add the token first.
- No `any`. No `@ts-expect-error` without a comment saying what is suppressed.
- **The frontend never touches the database.** Pages call the gateway through
  `frontend/lib/api.ts`; `lib/student.ts` wraps the calls a page actually needs.
  Only `packages/db` and the backend services import Drizzle. This is now
  literally true rather than aspirational: the frontend container holds no
  `DATABASE_URL`, so a new Drizzle read fails at runtime rather than working
  quietly. `lib/skills.ts` re-exports `phases` and `readiness` from
  `@skillforge/db`, which are pure functions over rows the gateway returned —
  no connection involved.
- **Nothing in `(app)` renders for an anonymous visitor.** The layout calls
  `requireUser()`. Every page inside is one student's data.
- **Never hardcode a student.** Skills come from `studentSkills` via the
  gateway, the goal from `profiles.targetRoleId`. The seeded demo account is
  ordinary rows like anyone else's — no code path knows its id.
- Auth is re-verified at the data layer on every protected route and action,
  never in middleware alone.
- Security headers are set in `frontend/next.config.ts`, not in the Caddyfile.
  Caddy is behind the opt-in `edge` profile and does not run in production, so
  anything set only there reaches nobody.
- The roadmap's structure is computed by the Python service. The LLM writes
  prose into `narration` and `rationale` columns only, through ai-service
  `/narrate`, and only after the phases are settled. Never let a model decide
  phase ordering.
- Comments only where the reason is not inferable from the code. No prose
  headers explaining a module's philosophy.
- Commit messages are one line. No body.

## Architecture

Service names match the diagram in the requirements PDF exactly. Judges compare
against it — do not rename.

```
React (frontend/)
   ↓
api-gateway
   ↓
auth-service  ·  profile-api  ·  ai-service
   ↓
python-analyzer  ·  skill-service
```

```
frontend/          Next.js — UI only, calls the gateway
backend/
  api-gateway/     Routes to services, verifies session once, forwards identity
  auth-service/    Better Auth, argon2id, users/sessions/roles
  profile-api/     Profile, projects, certifications, uploads, mentor roster
  skill-service/   Taxonomy, prerequisite graph, assessments, progress, roadmaps
ai-service/        DeepSeek generation, RAG retrieval, the agent and its tools
python-analyzer/   SkillAnalyzer, SkillGapCalculator, RoadmapGenerator
packages/db/       Drizzle schema + migrations
packages/service-kit/  Shared env, http, identity middleware
rag/knowledge-base/    Markdown corpus, a submission deliverable
```

### Two kinds of `/api/ai`

Easy to confuse, and Caddy makes the difference invisible:

- **`/ai/*`** — Next route handlers. They assemble the signed-in student's
  context server-side, then call ai-service. This is what the UI calls.
- **`/api/ai/*`** — Caddy sends *everything* under `/api/` to the gateway,
  which forwards to ai-service unchanged. Raw service access.

A Next route under `/api/` is unreachable in compose: Caddy intercepts it
before Next ever sees it. Put app routes outside `/api/`.

`/ai/*` sits outside `(app)`, so no layout has already turned an anonymous
visitor away — each handler calls `aiUser()` from `frontend/app/ai/guard.ts`
itself. Without that the deployed site is an open proxy to a paid model. Any
new route under `/ai/` starts with the same two lines.

### Docker build context

**Every image builds from the repo root.** `ai-service/Dockerfile` copies
`rag/knowledge-base/`, which lives outside its own directory, so paths inside
each Dockerfile are repo-relative:

```bash
docker build -f ai-service/Dockerfile .
```

The root `.dockerignore` is the only one that applies. It excludes `*.md` but
re-includes `rag/knowledge-base/**/*.md` — drop that negation and ai-service
builds fine and answers nothing.

## Domain scope: technology careers

The problem statement is explicit — "students who want a career in technology".
The seed taxonomy is tech only. The six assessment areas the PDF names are the
seed subcategories: **Python, Web Development, Git, DevOps, AI, Database.**

Do not broaden into marketing, HR or media. The graph is more convincing dense
and narrow than sparse and wide.

## The demo flow is the spec

The PDF's required demo, and where each step lives:

| Step | Where |
|---|---|
| Create account | `/register` → auth-service |
| Create student profile | `/profile` → profile-api |
| Add skills | `/profile` skill claims, `source: self_reported` |
| Take assessment | `/assessments` → writes `studentSkills` + FSRS `skillState` |
| View skill gaps | `/graph`, `/dashboard` — mastery from real levels |
| Generate AI roadmap | `/roadmap` → python-analyzer `/plan` |
| Ask RAG assistant | the assistant → ai-service `/chat` |
| Career Agent analyses profile | ai-service `/agent`, six tools |
| Deployment | compose, kubernetes/, terraform/ |

A step that only works for a hardcoded student does not count as working.

## Roadmap pipeline

| Stage | Source |
|---|---|
| Current Level | `studentSkills` + assessment attempts |
| Skill Gap | `SkillGapCalculator.identify_gaps()` |
| Recommended Topics | topological layering of the gap subgraph |
| Projects | `resources` rows with `type = 'project'` |
| Resources | `resources` rows for each phase's skills |
| Target Role | `profiles.targetRoleId` → `roleRequirements` |

## The data model in one paragraph

`skills` is one table with an `altitude` enum (CATEGORY / SUBCATEGORY / SKILL).
Two structures sit over it: a **tree** via `parentId` (the Skill Tree view,
student at the root) and a **DAG** via `skillPrerequisites`, leaves only (the
Skill Graph). The **roadmap is not a third structure** — it is the target
role's required subgraph, minus what the student has demonstrated, layered by
topological sort. Three views, one table.

## Rules duplicated in two languages

These exist twice and **must change together**:

| Rule | TypeScript | Python |
|---|---|---|
| A prerequisite counts as met at half the required level | `roleSkillGraph()` in `packages/db` | `SkillGapCalculator._is_foundation()` |
| Phase = rank of the topological sort | `phases()` in `packages/db` | `RoadmapGenerator` |

`python-analyzer` serves two different shapes on purpose: `/roadmap` speaks
ai-service's `AnalysisRequest`, `/plan` speaks skill-service's `SkillRow`.
Changing one does not change the other.

## Authorization

Three roles: `student`, `mentor`, `admin`.

- A student reads and writes their own rows.
- A **mentor** reads a student only if a `mentorships` row joins them. This is a
  database join, never a role-string check — see `requireReadAccess` in
  profile-api. A mentor may look, never edit.
- An **admin** reads anyone, and is the only role that can change a role or
  assign a mentor. An admin cannot demote themselves: the last one doing so
  would leave nobody able to promote anyone back.

## Ownership

| Area | Owner |
|---|---|
| Graph views, roadmap UI, skill tree, mentor/admin dashboard | Azeem |
| `python-analyzer`, `ai-service`, RAG, agent | Azeem |
| `auth-service`, `profile-api`, `skill-service`, `api-gateway` | Awaim |
| Assessment flow, FSRS progress | Awaim |
| Docker, Compose, Kubernetes, Terraform, Coolify | Awaim |
| `packages/db` schema | Either — announce before changing |

Adjust by agreement, not silently. Both must be able to explain the whole
system — judges ask.

## Forbidden

- CSS Modules, styled-components, any CSS system that is not Tailwind v4
- Supabase, Vercel — we self-host on Coolify. Postgres lives in the compose.
- `npm install` inside a workspace folder. Install from the repo root.
- `git add -A`. Two people share this tree; stage by path so you commit only
  your own work.

## Decisions and status

`docs/status.md` — what is built, what is next, who owns it. **Check here first.**
`docs/decisions.md` — settled calls and why. Read before re-proposing something
that was already rejected.
`docs/api.md` · `docs/architecture.md` · `docs/schema.md` — submission docs.
