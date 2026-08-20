# SkillForge — Agent Canon

AI-powered student skills and career development platform. Hackathon project,
2-person team. Read this before writing any code.

## Stack — do not substitute

- **Node 24 + npm.** Not Bun, not pnpm. Lockfile is `package-lock.json`.
- **Next.js 16** App Router, React 19, TypeScript strict, Turbopack
- **Tailwind v4** CSS-first, no config file. **No CSS Modules.** No other CSS
  system anywhere in the repo.
- **PostgreSQL 17 + pgvector**, Drizzle ORM, migrations checked in
- **Better Auth** with argon2id, database sessions
- **FastAPI** for the two Python services
- **DeepSeek** for all LLM calls (OpenAI-compatible SDK, `base_url` swapped)
- **fastembed** for embeddings — DeepSeek has no embeddings endpoint
- **Docker Compose** is both local dev and production. Deployed via Coolify.

## Hard rules

- No hardcoded colours. Every colour comes from a token in
  `frontend/app/globals.css`. If a value is missing, add the token first.
- No `any`. No `@ts-expect-error` without a comment saying what is suppressed.
- Database access goes through `packages/db`. Components never import Drizzle.
- Auth is re-verified at the data layer on every protected route and action,
  never in middleware alone.
- The roadmap's structure is computed by the Python service. The LLM writes
  prose into `narration` and `rationale` columns only. Never let a model decide
  phase ordering.
- Comments only where the reason is not inferable from the code. No prose
  headers explaining a module's philosophy.
- Commit messages are one line. No body, no co-author trailer.

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
  profile-api/     Student profile, projects, certifications, uploads
  skill-service/   Taxonomy, prerequisite graph, assessments, progress, roadmaps
ai-service/        DeepSeek generation, RAG retrieval, the agent and its tools
python-analyzer/   SkillAnalyzer, SkillGapCalculator, RoadmapGenerator
packages/db/       Drizzle schema + migrations
rag/knowledge-base/  Markdown corpus, a submission deliverable
```

## Domain scope: technology careers

The problem statement is explicit — "students who want a career in technology".
The seed taxonomy is tech only. The six assessment areas the PDF names are the
seed subcategories: **Python, Web Development, Git, DevOps, AI, Database.**

Do not broaden into marketing, HR or media. The graph is more convincing dense
and narrow than sparse and wide.

## Roadmap pipeline

The PDF's required pipeline, and where each stage comes from:

| Stage | Source |
|---|---|
| Current Level | `studentSkills` + assessment attempts |
| Skill Gap | `SkillGapCalculator.identify_gaps()` |
| Recommended Topics | topological layering of the gap subgraph |
| Projects | `resources` rows with `type = 'project'` |
| Resources | `resources` rows for each phase's skills |
| Target Role | `targetRoles` + `roleRequirements` |

## The data model in one paragraph

`skills` is one table with an `altitude` enum (CATEGORY / SUBCATEGORY / SKILL).
Two structures sit over it: a **tree** via `parentId` (the Skill Tree view,
student at the root) and a **DAG** via `skillPrerequisites`, leaves only (the
Skill Graph view). The **roadmap is not a third structure** — it is the target
role's required subgraph, minus what the student has demonstrated, layered by
topological sort. Three views, one table.

## Ownership

Split so the two of us do not collide. Adjust by agreement, not silently.

| Area | Owner |
|---|---|
| Graph views, roadmap UI, skill tree | Azeem |
| Python service, AI service, RAG, agent | Azeem |
| Auth service, core service, gateway | Partner |
| Assessment flow, FSRS progress | Partner |
| Docker, Compose, Coolify deploy | Partner |
| `packages/db` schema | Either — announce before changing |

Both must be able to explain the whole system. Judges ask.

## Forbidden

- CSS Modules, styled-components, any CSS system that is not Tailwind v4
- Copying code out of `/home/azeem/work/keystone-web` — it is a work repo.
  Reference it for patterns only.
- Shipping Keystone's `skills.json` / `tags.json`. Harvest names, not files.
- Supabase, Vercel — we self-host on Coolify. Postgres lives in the compose.
- `npm install` inside a workspace folder. Install from the repo root.

## Skills

`.claude/skills/` — invoke by name.

| Skill | Use when |
|---|---|
| `db-change` | Changing the Drizzle schema |
| `ui-component` | Building any UI |
| `add-service` | Adding or wiring a backend service |

## Decisions

`docs/decisions.md` records what was settled and why. Read it before
re-proposing something that was already rejected.
