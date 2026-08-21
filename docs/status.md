# Status

What is built, what is not, and who owns what. Update the boxes as things land —
this is how Azeem and Awaim stay in sync.

Last updated: 2026-08-21, after the demo account, roadmap narration, the two
missing Kubernetes manifests and assessment results in the mentor view. Before
that: the new assessments and a pass that re-checked every line against the
requirements PDF — see `TODO.md`'s "Submission checklist" section for that
audit in full.

Every counted number below was read off the running system, not estimated: seed
counts from Postgres, test counts from `pytest`, endpoint lists from the routers.

## The demo flow works end to end

Every step of the PDF's required demo runs against a real account. No step
depends on a hardcoded student.

| Step | Where | State |
|---|---|---|
| Create account | `/register` → auth-service | done |
| Create student profile | `/profile` → profile-api | done |
| Add skills | `/profile`, `source: self_reported` | done |
| Take assessment | `/assessments` → `student_skills` + FSRS `skill_state` | done |
| View skill gaps | `/graph`, `/tree`, `/dashboard` | done |
| Generate AI roadmap | `/roadmap` → python-analyzer `/plan`, persisted | done |
| Ask RAG assistant | `/assistant` → ai-service `/chat` | done |
| Career Agent analyses profile | ai-service `/agent`, six tools | done |
| Deployment | `docker-compose.yml`, `kubernetes/`, `terraform/` | compose done, see gap below |

## Done

### Foundation — Azeem
- [x] Monorepo, Bun workspaces, Next 16, React 19, Tailwind v4
- [x] shadcn/ui (radix-nova preset), 14 components installed
- [x] Design tokens in `frontend/app/globals.css` — warm palette, `--mastery-*`
      states, `--ai` reserved for model output. **Only source of colour.**
      `gap` is red (`--destructive-*`), not amber: red is the faster read for
      "missing". Locked keeps grey plus a padlock so it cannot be confused with
      skills outside the goal, which are faded instead.
- [x] `docs/decisions.md` — settled calls, read before re-proposing
- [x] `.env.example` with all six service URLs and the DeepSeek keys

### Database — either (shared surface: announce before changing)
- [x] 26 tables across auth, skills, profile, assessment, progress, roadmap
- [x] Migration `0000_init.sql`, applied and verified against Postgres 17
- [x] Seed, verified in the live database: **3 categories, 8 subcategories,
      124 skills, 144 prerequisite edges, 4 target roles, 92 role requirements,
      56 resources, 15 assessments, 150 questions** — 7 second-sitting
      assessments added on top of the original one-per-subcategory set, going
      deeper into skills the fundamentals sitting didn't reach. Needs a
      `bun run db:seed` to land in a given environment.
- [x] Seed validates on run: cycle detection, dangling refs, unknown slugs,
      MCQ choice/index range
- [x] Deterministic ids from slugs, so re-seeding updates rows in place instead
      of orphaning attempt answers that point at them
- [x] `packages/db/src/queries/skills.ts` — role closure, mastery states, phases,
      full taxonomy tree

### Backend services — Awaim
- [x] **`docker-compose.yml`** — 10 services, 4 volumes. Postgres is
      `pgvector/pgvector:pg17`. Compose is both local dev and production.
- [x] **`backend/auth-service`** — Better Auth, argon2id at the OWASP baseline,
      database sessions, three roles. Two hashing backends (`Bun.password`
      natively, pure JS otherwise) emitting one PHC format, so a hash written
      by either verifies under the other.
- [x] **`backend/api-gateway`** — verifies the session once, forwards identity
      as headers. `src/{index,proxy,session}.ts`
- [x] **`backend/profile-api`** — profile, portfolio (projects, certifications),
      CV uploads, mentor roster. `requireReadAccess` is a `mentorships` join,
      never a role-string check.
- [x] **`backend/skill-service`** — taxonomy, assessments, grading, progress,
      roadmap. Imports the same query functions `packages/db` exposes.
- [x] `packages/service-kit` — shared env, http and identity middleware
- [x] Rate limits on `/sign-in/email` and `/sign-up/email`, configurable by env

### Assessment and progress — Awaim
- [x] Assessment UI — recall/cloze/MCQ, `components/assessment/{quiz,result-card,start-button}.tsx`
- [x] Scoring and per-skill breakdown, sorted worst-first
- [x] `GET /assessments`, `GET /assessments/:slug`, `POST /assessments/:slug/attempts`,
      `POST /attempts/:id/submit`, `GET /attempts`, `GET /attempts/:id`
- [x] FSRS wiring — `src/scheduler.ts` is the only module importing `ts-fsrs`;
      `skill_state` is keyed `(userId, skillId)`, not on cards. Fuzz off.
- [x] `GET /progress`, `/progress/due`, `/progress/history`, `/progress/reviews`,
      `POST /progress/:slug/review`

### Deployment — Awaim
- [x] `docker-compose.yml`, `docker/Caddyfile`, `docker/migrate.{Dockerfile,sh}`
- [x] `kubernetes/` — 14 manifests: namespace, config, postgres, migrate job,
      auth-service, profile-api, skill-service, python-analyzer, ai-service,
      api-gateway, frontend, uploads PVC, ingress, network policies. Every
      service in the compose file has a `Deployment`; ai-service runs one
      replica because each one embeds the corpus at boot and shares nothing.
- [x] `terraform/` — `main.tf`, `variables.tf`, `outputs.tf`, `cloud-init.yaml`,
      `terraform.tfvars.example`
- [x] `scripts/setup.sh` — one command from a fresh clone, safe to re-run;
      `scripts/promote.sh` makes the first admin from outside the app
- [x] `docs/cicd.md` — covers the bonus CI/CD requirement without a pipeline

### Frontend — Azeem
- [x] App shell with collapsible sidebar, 15 pages
- [x] `/dashboard` — readiness, mastery counts, start-here, skills by category
- [x] `/graph` — React Flow, elk layout in per-category bands, mastery colours,
      prerequisite edges, skill detail panel
- [x] `/roadmap` — phase cards with a clickable phase spotlight
- [x] `/tree` — d3 circle packing, student at the root, click-to-focus zoom,
      breadcrumb, search across all three altitudes
- [x] `/profile` — profile fields, skill claims, projects, certifications,
      CV upload with inline sandboxed preview (pdf/png/jpeg, 5 MB cap)
- [x] `/assessments`, `/assessments/[slug]`, `/assessments/attempts/[id]`
- [x] `/assistant` — multi-turn RAG assistant with retrieved sources
- [x] `/students`, `/students/[userId]` — mentor and admin dashboard,
      role management and mentor assignment
- [x] `/students/[userId]` shows the student's graded sittings and the
      per-skill breakdown of the most recent, through
      `GET /api/skills/students/:userId/attempts`
- [x] All of it reads the signed-in student through the gateway
- [x] Expand wand wired to ai-service `/expand`, with optimistic ghost nodes

### python-analyzer — Azeem
- [x] `SkillGraph` — closure, cycle detection, longest-path layering
- [x] `SkillGapCalculator` — weighted gaps, readiness score
- [x] `RoadmapGenerator` — phases with effort estimates
- [x] `SkillAnalyzer` — `calculate_score()`, `identify_gaps()`, `recommend_topics()`
- [x] **7 endpoints**: `/health` `/analyze` `/gaps` `/roadmap` `/plan`
      `/compare` `/score`. `/roadmap` speaks ai-service's `AnalysisRequest`,
      `/plan` speaks skill-service's `SkillRow` — two shapes on purpose.
- [x] **37 tests passing**, Dockerfile, README

### ai-service — Azeem
- [x] DeepSeek client (OpenAI-compatible, `base_url` swapped)
- [x] RAG: heading-aware chunking, fastembed embeddings, in-memory cosine
      search over 140 chunks. *Not* pgvector — a linear scan beats a round trip
      at this size. Revisit if the corpus grows.
- [x] **Career Planning Agent, 6 tools**, `/agent` endpoint. Four call
      python-analyzer (`/analyze`, `/gaps`, `/roadmap`, `/compare`), one
      searches the embedded corpus, one reads the student's graded attempts.
      None return canned text. The PDF names four; `compare_target_roles` and
      `get_assessment_history` are ours on top.
- [x] `/expand` for the wand — returns structured sub-skills
- [x] **6 endpoints**: `/health` `/search` `/chat` `/agent` `/expand`
      `/narrate`. `/search` returns retrieval with no generation, which makes
      it easy to show a judge what RAG actually retrieved; `/narrate` is the
      only one whose output is written to the database.
- [x] **57 tests passing**, Dockerfile, README
- [x] Embeds the whole corpus at boot before opening the port, so the first
      question is not the one that pays for the model load

### RAG knowledge base — Azeem
- [x] `rag/knowledge-base/careers/` — four role guides
- [x] `rag/knowledge-base/roadmaps/sequencing-principles.md`
- [x] `rag/knowledge-base/roadmaps/common-questions.md`
- [x] `rag/knowledge-base/projects/project-selection.md`
- [x] `rag/knowledge-base/skills/` — seven reference docs, one per taxonomy
      subcategory (`foundations`, `web-development`, `databases`, `devops`,
      `machine-learning`, `data-analysis`, `cloud-and-security`), so every
      branch of the skill tree has grounding for `/search`,
      `search_learning_resources` and `/chat` citations, not just the eight
      skills `foundations.md` started with
- [x] Ships inside the ai-service image — a submission deliverable, and small
      enough that a volume would only add a failure mode

### Roadmap persistence — Azeem
- [x] `roadmaps`, `roadmap_phases`, `roadmap_phase_skills` all written
- [x] Structure comes from python-analyzer `/plan` when it is reachable and
      from `phases()` in `packages/db` when it is not. Either way no model
      decides ordering; the response reports which source ran.
- [x] Regenerating archives the previous roadmap rather than deleting it

### Demo account — either
- [x] `bun run db:seed:demo` — `packages/db/src/seed/demo.ts`. A populated
      student, a mentor joined to them by a `mentorships` row, and an admin, so
      an instance nobody has registered on still shows a working system.
      **demo@example.com / mentor@example.com / admin@example.com, password
      `skillforge-demo-2026`.**
- [x] Nothing is reimplemented: passwords go through auth-service's
      `hashPassword`, the four simulated sittings are graded by skill-service's
      own grader and scheduled by its FSRS module, and the roadmap is laid out
      by the same `phases()` the route uses. Re-running updates in place.
- [x] Runs from `setup.sh` locally and from the migrate container in compose
      and Kubernetes, both gated on `SEED_DEMO` (default true — turn it off for
      anything that is not a demo, the password is public)

### Roadmap narration — Azeem
- [x] ai-service **`/narrate`** — one narration and one rationale per phase,
      grounded in the knowledge base, called by skill-service after the phases
      are settled. Verified against the live DeepSeek API: about 5s for a
      seven-phase plan.
- [x] `backend/skill-service/src/narrator.ts` — 20s budget, fails soft. An
      unreachable or unconfigured ai-service leaves `narration` and `rationale`
      null and changes nothing else about the plan; the response says
      `narrated: false`.
- [x] A rationale for a phase number that was not sent is dropped rather than
      stored — the one way a model could otherwise reshape a plan it was only
      asked to describe
- [x] The narration renders in the `--ai` gold block on `/roadmap`, which is
      the token reserved for model output

### Documentation — either
- [x] `README.md` — setup, architecture, AI explanation
- [x] `docs/api.md` · `docs/architecture.md` · `docs/schema.md` · `docs/cicd.md`
- [x] `docs/decisions.md` — settled calls and why
- [x] `CONTRIBUTING.md` — stack rules, hard rules, ownership, kept current

## In progress

Nothing mid-flight right now — see **Next** for what's queued.

## Next

- [ ] Deploy to Coolify — Awaim
- [ ] Demo video (2–3 min) and presentation (5–7 min) — either

## Known issues

**Duplicated logic.** `packages/db/src/queries/skills.ts` computes gaps and
phases in TypeScript; `python-analyzer` computes the same thing in Python. The
readiness rule (a prerequisite counts at half its required level) is written out
in both — see `docs/decisions.md` and the table in `CONTRIBUTING.md`. They agree today
because they were aligned by hand. **This will drift.** Deliberately not being
fixed before submission: skill-service already prefers the analyzer and falls
back to the TypeScript path, which is the behaviour we want during judging.

**One direct database read is left in the frontend.** Down from all of them.
Everything a page renders now goes through `lib/student.ts` → `lib/api.ts` →
gateway. The exception is `frontend/app/ai/agent/route.ts`, which calls
`studentContext()` in `lib/skills.ts` and hits Drizzle through `lib/db.ts` to
assemble the agent's payload. `lib/db.ts` and the other three helpers in
`lib/skills.ts` (`roles`, `roleGraph`, `tree`) now have no callers at all —
delete them with that route's migration. Type-only imports of `@skillforge/db`
elsewhere are fine; they erase at compile time.

**Next runs on Node, not Bun.** `next build` segfaults on the Bun runtime
(SIGILL, Bun 1.3.14). Frontend scripts are plain `next dev` / `next build` on
purpose. Do not "fix" this to `bun --bun next` — it will break the build.

**ai-service is slow to start locally.** It embeds the corpus before opening the
port: about 75 s on a laptop with the model already cached, plus a one-time
~56 s download on the first run ever. `setup.sh --local` prewarms the model
outside the health window and pins `FASTEMBED_CACHE_PATH` out of `/tmp` so the
download does not repeat on every reboot. In compose the image ships the model,
so only the embedding time applies.
