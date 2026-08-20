# Decisions

Settled calls and the reasoning. Read before re-proposing something here.

## Problem statement: PS-03 SkillForge

Chosen over PS-04 FoodLoop. FoodLoop's stated advantage was "a real matching
algorithm at its core", but skill gap analysis *is* a matching algorithm —
student proficiency vector against weighted role requirements. Same substance,
and SkillForge lets us reuse an existing auth, assessment and Docker base.

## Stack: Bun, with Next on Node

Started on npm because Node looked steadier for the Docker and Kubernetes
deliverables. Switched to Bun once two things were clear: Retention Lab already
has a working Bun Dockerfile, so that risk was already retired, and Bun runs
TypeScript natively — which removed the `--experimental-strip-types` flags from
the migrate and seed scripts.

One caveat found by trying it: `next build` **segfaults** on the Bun runtime
(SIGILL, Bun 1.3.14). So the frontend scripts are plain `next dev` / `next
build`, which Bun executes via Node. Bun remains the package manager and the
runtime for every script that is not Next.

## Styling: Tailwind v4 everywhere, Keystone's tokens

Retention Lab's CSS Modules are discarded; its component *logic* is kept and
rebuilt with Tailwind. The whole app follows one visual system. Keystone's
token file ports directly because both use Tailwind v4's `@theme inline`.

Keystone's `--difficulty-*` tokens are replaced by `--mastery-*`, which is the
domain reframe: four states a skill can be in for a student.

## Database: self-hosted Postgres, not Supabase

Supabase was considered and dropped once the Coolify VPS was confirmed. With
our own host, an external DB costs us the thing we want most: `docker-compose.yml`
being simultaneously local dev and production. Judges run one command and get
the whole system.

Supabase Auth was rejected separately — §3 requires demonstrating password
hashing, and Better Auth with argon2id lets us point at the code. An auth
service whose answer to "what does it do" is "calls Supabase" is a weak
microservice.

## Deployment: Coolify on Contabo

Not Vercel. An all-Vercel deploy makes the compose file, the Kubernetes
manifests and the architecture diagram describe a system that does not exist —
and decorative infrastructure is explicitly what the rubric punishes.

## LLM: DeepSeek

OpenAI-compatible, so the `openai` SDK works with `base_url` swapped.
`deepseek-chat` supports function calling, which the agentic requirement needs.

**DeepSeek has no embeddings endpoint.** RAG therefore uses `fastembed` (ONNX,
~50MB, no PyTorch) running locally in the ai-service, with vectors in pgvector.
`sentence-transformers` was rejected — it pulls PyTorch and a ~2GB image, which
is too heavy for the VPS.

## Graph: one component, two lenses

The roadmap is not a separate artifact. It is the target role's required
subgraph, minus demonstrated skills, layered by topological sort and rendered
left-to-right with phase bands. Skill Graph and Roadmap are one React Flow
component with a `mode` prop.

This is the mitigation for the known risk that an LLM-generated roadmap reads
generic. Python computes the ordering; the model only writes the rationale.

Layout is dagre, not ELK. Keystone needed ELK tuning at 1,464 nodes and 3,635
edges; we have ~120 nodes.

## Skill data: written from scratch, not harvested

Keystone's `skills.json` was evaluated and **not used**. Its 41 categories are
an occupational taxonomy built for one company — Loan Processing, Risk
Policies, Transportation and Supply Chain, plus two categories corrupted by the
anonymisation pass. Nothing in it maps to a student learning to code, and the
878 roles are scrambled client job titles.

The seed taxonomy is authored directly: three categories over the six
assessment areas the PDF names, ~116 standard industry skill names. The only
thing taken from Keystone is the `altitude` schema shape (CATEGORY /
SUBCATEGORY / SKILL as one table), which is structural and stands on its own.

The prerequisite edges were always going to be hand-written — no public skills
dataset carries them, and they are the substance the roadmap computes over.

## FSRS keyed on skills, not cards

Retention Lab schedules a flashcard. We schedule a *skill*: proficiency decays
and must be re-earned, so "mastered" still means something a month later. No
other team will have spaced repetition, and it maps to SDG 4 more credibly than
a generated roadmap does.

## Readiness: a prerequisite counts at half the level the role asks

`locked` used to mean "a prerequisite has no evidence at all", so any level
above zero unlocked everything downstream. That produced Pandas flagged as a
startable gap while NumPy — its only prerequisite — sat at 1 of 4, next to
dashboard copy promising "every prerequisite is already met". The state and the
copy contradicted each other, and the copy was the part that was false.

Requiring the full level instead was measured, not assumed: it moves the demo
student from 5 startable skills to 2, and locks Unit Testing behind
Object-Oriented Programming going 3 → 4, which nobody would call a real
blocker. Half the required level keeps Unit Testing startable and drops Pandas,
which is the behaviour a student would expect from both.

The rule lives in `roleSkillGraph()` in `packages/db` and in
`SkillGapCalculator._is_foundation()` in `python-analyzer`. **Both must change
together** — this is the duplication `docs/status.md` flags as a drift risk, and
`tests/test_analyzer.py` pins the boundary at 1 (blocks) and 2 (unblocks) for a
requirement of 3.

Per-edge strengths would be the better lever, but all 144 seeded prerequisite
edges are `hard`, so `skillPrerequisites.strength` carries no signal today.
