# Status

What is built, what is not, and who owns what. Update the boxes as things land —
this is how Azeem and Awaim stay in sync.

Last updated: 2026-08-21, after the Bun switch.

## Done

### Foundation — Azeem
- [x] Monorepo, Bun workspaces, Next 16, React 19, Tailwind v4
- [x] shadcn/ui (radix-nova preset), 14 components installed
- [x] Design tokens in `frontend/app/globals.css` — warm palette, `--mastery-*`
      states, `--ai` reserved for model output. **Only source of colour.**
- [x] Agent harness: `CLAUDE.md`, `.claude/skills/{db-change,ui-component,add-service}`
- [x] `docs/decisions.md` — settled calls, read before re-proposing
- [x] `.env.example` with all six service URLs and the DeepSeek keys

### Database — Azeem (shared surface: announce before changing)
- [x] 26 tables across auth, skills, profile, assessment, progress, roadmap
- [x] Migration `0000_init.sql`, applied and verified against Postgres 17
- [x] Seed: 3 categories, 8 subcategories, **124 skills, 144 prerequisite edges**,
      4 target roles with weighted requirements, 56 resources
- [x] Seed validates on run: cycle detection, dangling refs, unknown slugs
- [x] `packages/db/src/queries/skills.ts` — role closure, mastery states, phases

### Frontend — Azeem
- [x] App shell with collapsible sidebar
- [x] `/dashboard` — readiness, mastery counts, start-here, skills by category
- [x] `/graph` — React Flow, dagre layout, mastery colours, prerequisite edges
- [x] `/roadmap` — same component in `mode="roadmap"`, phase cards
- [x] All three read live from Postgres (`force-dynamic`)
- [x] Expand wand UI — **visual only, not wired to a model yet**

### python-analyzer — Azeem
- [x] `SkillGraph` — closure, cycle detection, longest-path layering
- [x] `SkillGapCalculator` — weighted gaps, readiness score
- [x] `RoadmapGenerator` — phases with effort estimates
- [x] `SkillAnalyzer` — `calculate_score()`, `identify_gaps()`, `recommend_topics()`
- [x] FastAPI: `/health` `/analyze` `/gaps` `/roadmap` `/score`
- [x] 27 tests passing, Dockerfile, README

### RAG knowledge base — Azeem
- [x] `rag/knowledge-base/careers/` — four role guides
- [x] `rag/knowledge-base/roadmaps/sequencing-principles.md`
- [x] `rag/knowledge-base/projects/project-selection.md`
- [x] `rag/knowledge-base/skills/foundations.md`
- [x] `rag/knowledge-base/roadmaps/common-questions.md`

## Next — Azeem

- [x] **ai-service** — built, 30 tests passing
  - [x] DeepSeek client (OpenAI-compatible, `base_url` swapped)
  - [x] RAG: heading-aware chunking, fastembed embeddings, in-memory cosine
        search. *Not* pgvector — the corpus is a few dozen chunks, so a linear
        scan beats a round trip. Revisit if it grows.
  - [x] Career Planning Agent, 4 tools, `/agent` endpoint
  - [x] `/expand` endpoint for the wand — returns structured sub-skills
  - [ ] Call `/expand` from the graph UI (endpoint is ready, button still fakes it)
  - [ ] Roadmap narration + phase rationales (prose only — never ordering)
  - [ ] Verify against the live DeepSeek API — needs `DEEPSEEK_API_KEY`
- [ ] **Skill Tree** (`/tree`) — d3 circle packing, student at root
- [ ] Replace the frontend's duplicated gap/phase logic with calls to
      python-analyzer *(needs compose running — see blocker below)*
- [ ] Persist generated roadmaps (`roadmaps` tables exist, currently unused)

## Next — Awaim

- [ ] **`docker-compose.yml`** — highest priority, unblocks several things.
      Postgres image **must** be `pgvector/pgvector:pg17`
- [ ] `backend/auth-service` — Better Auth, argon2id, 3 roles. Schema already
      written in `packages/db/src/schema/auth.ts`; **do not regenerate it**, it
      has three hand-applied edits documented in the file
- [ ] `backend/api-gateway` — verify session once, forward identity as headers
- [ ] `backend/profile-api` — profile, projects, certifications, CV upload
- [ ] `backend/skill-service` — taxonomy, assessments, progress. Imports the
      same query functions the frontend uses today
- [ ] Assessment UI — recall/cloze/MCQ, scoring, per-skill breakdown
- [ ] FSRS wiring — `skill_state` is keyed `(userId, skillId)`, not on cards
- [ ] `kubernetes/` manifests, `terraform/`, `scripts/setup.sh`
- [ ] Deploy to Coolify
- [ ] `docs/` — API documentation, architecture diagram, database schema diagram

## Either / together

- [ ] README with setup, architecture and AI explanation
- [ ] Demo video, 2–3 min
- [ ] Presentation, 5–7 min
- [ ] Seed a demo student so the dashboard has a real account behind it
      *(needs auth-service first)*
- [ ] Assessment question bank — Awaim owns the engine, content can be split

## Known issues

**Duplicated logic.** `packages/db/src/queries/skills.ts` computes gaps and
phases in TypeScript; `python-analyzer` computes the same thing in Python. They
agree today because they were aligned by hand. **This will drift.** The fix is
skill-service calling the analyzer and the frontend computing nothing — blocked
on compose.

**Frontend reads Postgres directly.** `frontend/lib/db.ts` violates the "no
Drizzle in components" rule. Deliberate and temporary: the queries live in
`packages/db`, so skill-service imports the same functions and the frontend
switches to the gateway.

**Next runs on Node, not Bun.** `next build` segfaults on the Bun runtime
(SIGILL, Bun 1.3.14). Frontend scripts are plain `next dev` / `next build` on
purpose. Do not "fix" this to `bun --bun next` — it will break the build.

**No auth yet.** Everything runs as a hardcoded demo student in
`frontend/lib/demo-student.ts`. Replace once auth-service lands.
