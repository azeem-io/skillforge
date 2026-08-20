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

## Local dev: two env files, ad hoc Postgres until compose lands

Next.js only auto-loads env files from its own directory. A root `.env` (what
`packages/db`'s scripts read via `--env-file=../../.env`) is invisible to
`frontend/`, so `frontend/lib/db.ts` needs its own `frontend/.env.local` with
the same `DATABASE_URL`. Both are gitignored; neither is committed.

`docker-compose.yml` now exists and owns the port-5432 contract, which is what
`.env.example` states. Two ways to run locally: `./scripts/setup.sh` brings up
the whole compose stack, and `./scripts/setup.sh --local` runs the services on
the host with Postgres alone in a container. If `5432` is already taken on your
machine, remap the container and edit *your* `.env` / `.env.local` — not
`.env.example`, which should keep describing the deployed contract.

## FSRS keyed on skills, not cards

Retention Lab schedules a flashcard. We schedule a *skill*: proficiency decays
and must be re-earned, so "mastered" still means something a month later. No
other team will have spaced repetition, and it maps to SDG 4 more credibly than
a generated roadmap does.

## Backend services: Hono on Bun

Nothing in the stack rules named an HTTP framework for the four Node services.
Hono, because it is Web-standard `Request`/`Response` — which means the service
*is* a `fetch` handler, `export default { port, fetch: app.fetch }`, and the
Dockerfile needs no build stage at all since Bun runs the TypeScript directly.
Better Auth's handler takes a `Request` and returns a `Response`, so it mounts
without an adapter.

Express was the alternative and was rejected on the same ground that made Bun
attractive: it would have reintroduced a build step and a second runtime for no
gain a judge can see.

## A shared `packages/service-kit`

Env parsing, the identity middleware, the error shape and the health route are
identical in all four services. Copied four times, they drift — and the one that
drifts is the identity check. It is a library, not a service, so it sits in
`packages/` beside `db` and does not appear in the architecture diagram.

## Identity: headers signed with a shared gateway secret

The gateway verifies the session once and forwards `x-skillforge-user-id`,
`-email` and `-role`. Two things make that safe:

The gateway strips those headers from every inbound request before setting its
own, so a client cannot assert its own identity. And services only believe them
when the request also carries `x-skillforge-gateway-key`; a wrong key is a 401,
not a fallback to anonymous.

Compose already keeps the services unpublished, and the Kubernetes manifests add
a NetworkPolicy. But network reachability is one mistake away from being wrong,
and a forged header should fail closed rather than depend on the network being
right. Verified both ways: a forged header through the gateway and a forged
header direct to a service both 401.

## Roadmap: analyzer first, local layering as the fallback

`POST /api/skills/roadmap` calls `python-analyzer` with a 4s timeout and falls
back to `phases()` in `packages/db` — the longest-path layering already in the
repo, marked there as moving to `RoadmapGenerator` once that service lands. The
response says which ran, in `source`.

The rule that no model decides phase ordering is unaffected: the fallback is a
topological sort in TypeScript, not a prompt. `narration` and `rationale` stay
null for ai-service to fill.

The alternative — 503 until python-analyzer exists — was rejected because it
makes the roadmap undemoable for as long as that service is unwritten, and the
fallback is code Azeem already committed.

## Assessment scoring writes evidence, and knows what not to overwrite

A submitted attempt writes `student_skills` at `level = round(1 + ratio × 4)`
with `source: "assessment"`, and advances the FSRS schedule for each skill the
questions were tagged with.

The upsert carries a `setWhere` clause restricting it to rows whose existing
source is `self_reported` or `assessment`. A level earned through a project or a
certification is evidence from somewhere a ten-question quiz cannot see, and a
bad morning should not erase it. Verified: a project-sourced row survives a
sitting that covers the same skill.

Every question in the bank is graded, not just the answered ones — an
unanswered question is wrong, and omitting it would inflate the score.

## Bun's isolated linker breaks Next's file tracer

`bun install` defaults to an isolated layout: real packages in
`node_modules/.bun`, each workspace holding relative symlinks into it. Next's
standalone tracer cannot follow that, and produces an output missing
`@swc/helpers` — which fails at container start, not at build time, so the image
looks fine until it crash-loops.

Every Dockerfile therefore installs with `--linker=hoisted`, the flat npm-shaped
tree. The host install is untouched; this is a container-only flag.

## Terraform targets Contabo directly

Contabo publishes a Terraform provider (`contabo/contabo`), so `terraform/`
describes the VPS that actually runs the deployment rather than a cloud we do
not use. `contabo_instance` has an `existing_instance_id` field, so the config
adopts the box already running Coolify instead of ordering a second one.

A generic AWS skeleton was the alternative and is exactly the decorative
infrastructure the rubric punishes: familiar to a judge, and describing a
deployment that does not exist.

## Kubernetes manifests validated with kubeconform

The `add-service` skill says to validate with `kubectl apply --dry-run=client`,
which needs a live cluster to fetch the OpenAPI schema — there is none here, and
it fails before checking anything. `kubeconform -strict` validates against real
1.31 schemas offline and additionally rejects unknown fields, which is what
catches a mistyped key. 20 resources, all valid.
