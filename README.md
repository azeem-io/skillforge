# SkillForge

AI-powered student skills and career development platform. Assess what you know,
see the gap to the role you want, and get a roadmap that respects prerequisites.

Read `CONTRIBUTING.md` before writing code — stack rules, architecture, ownership.

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
| `ai-service` | 8084 | DeepSeek generation, RAG retrieval, the Career Planning Agent |
| `python-analyzer` | 8085 | SkillAnalyzer, SkillGapCalculator, RoadmapGenerator |
| `postgres` | — | PostgreSQL 17 + pgvector. Never published |
| `caddy` | 80/443 | TLS, and the only container that publishes ports |

If `python-analyzer` is unreachable, the roadmap falls back to a local
topological layering rather than failing — the structure is the same, only the
effort estimates and narration are lost.

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
| `bun run db:seed:demo` | Seed the demo student, mentor and admin |
| `bun run db:studio` | Drizzle Studio |
| `bun run typecheck` | Typecheck every workspace |

## Try it

Sign in as the seeded demo student — **demo@example.com**, password
**`skillforge-demo-2026`** — for an account that already has four graded
assessments, a portfolio and a roadmap. `mentor@example.com` and
`admin@example.com` use the same password and show the other two roles; the
mentor is joined to the demo student by a `mentorships` row, so they see that
student and no one else.

These credentials are public, which is the point of `SEED_DEMO`: set it to
`false` in `.env` for any instance that is not a demo.

Or start from nothing:

1. Register at `/register` — passwords are at least 12 characters, hashed with
   argon2id.
2. Set a target role on `/profile`. That is what everything measures against.
3. Take an assessment at `/assessments` — searchable, 15 sittings across eight
   areas, ten questions each.
4. The result scores **per skill**, writes your proficiency levels and starts a
   spaced-repetition schedule for each one.
5. `/graph` and `/roadmap` now reflect what you actually demonstrated. `/tree`
   shows the same mastery over the whole taxonomy as circle packing.
6. Ask `/assistant` anything — it answers from the knowledge base with
   citations, and calls the analyzer when the question needs real numbers.
7. Mentors and admins get `/students`. A mentor sees only the students a
   `mentorships` row assigns them; an admin sees everyone and can change roles.

## How the AI works

Three distinct capabilities, deliberately kept separate.

**Generative** — `/roadmap` asks python-analyzer for the phase structure, then
ai-service `/narrate` has DeepSeek write the `narration` and per-phase
`rationale` prose. The model never
decides ordering: phases are a rank of the topological sort over the prerequisite
DAG, computed in `RoadmapGenerator`. This is what stops an AI roadmap reading
generic, and it is why the same student always gets the same sequence.

**RAG** — `rag/knowledge-base/` is a markdown corpus of career guides, sequencing
principles, project selection and a skill reference for every taxonomy
subcategory — Programming Languages, Web Development, Version Control,
Databases, Data Analysis, Machine Learning, DevOps, Cloud and Security.
ai-service chunks it on headings at boot, embeds with `fastembed` (ONNX, no
PyTorch) and retrieves by cosine similarity. Answers cite sources as `[1]`,
`[2]`, and the UI renders each one as a hoverable superscript linked to the
retrieved chunk.

**Agentic** — the Career Planning Agent at `/ai/agent` runs a tool-calling loop
over six tools: `analyze_student_skills`, `generate_skill_gap`, `create_roadmap`,
`compare_target_roles`, `search_learning_resources` and
`get_assessment_history`. Ask it *"Analyze my
profile and tell me what I should learn next"* and it retrieves your skills,
computes the gaps through python-analyzer, and recommends seeded resources. The
tools it called are shown under each answer.

DeepSeek is used for every LLM call (OpenAI-compatible SDK with `base_url`
swapped). It has no embeddings endpoint, which is why retrieval uses `fastembed`
locally rather than an API.

## Docs

- `CONTRIBUTING.md` — stack, hard rules, architecture, ownership
- `docs/architecture.md` — services, request path, how identity travels
- `docs/api.md` — every endpoint, and the python-analyzer contract
- `docs/schema.md` — the data model, with ER diagrams
- `docs/cicd.md` — build, test gates, migrations, deploy and rollback
- `docs/decisions.md` — settled decisions and why; read before re-proposing

`docs/architecture.pdf`, `docs/database-schema.pdf` and `docs/api.pdf` are the
same three documents as PDFs, diagrams rendered, for reading outside GitHub.
The markdown is authoritative — regenerate the PDFs from it rather than editing
them.

## Deployment

`docker-compose.yml` is both local development and production, deployed with
Coolify on a Contabo VPS.

- `kubernetes/` — the same system as Deployments and Services, validated with
  `kubeconform -strict` against Kubernetes 1.31 schemas
- `terraform/` — provisions or adopts the Contabo VPS, with cloud-init
  installing Docker and Coolify
