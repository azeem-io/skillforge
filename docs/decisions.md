# Decisions

Settled calls and the reasoning. Read before re-proposing something here.

## Problem statement: PS-03 SkillForge

Chosen over PS-04 FoodLoop. FoodLoop's stated advantage was "a real matching
algorithm at its core", but skill gap analysis *is* a matching algorithm —
student proficiency vector against weighted role requirements. Same substance,
and SkillForge lets us reuse an existing auth, assessment and Docker base.

## Stack: Node 24 + npm, not Bun

Retention Lab is Bun-based, but the logic we lift from it (queries, scheduler,
session builder, password hashing) has zero Bun or Next imports — it is plain
TypeScript. Node is the steadier base for the Docker and Kubernetes
deliverables. Reversible if it becomes a problem.

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

## Skill data: harvest names, do not ship files

Keystone's `skills.json` is 7,081 records — 41 categories, 527 subcategories,
6,513 skills. The skill and subcategory layers are clean industry taxonomy
(only 2.9% show anonymisation artifacts) but all 878 roles are scrambled client
names, and `programs` is a client catalogue.

Take: the `altitude` schema shape, ~8 category names, ~120 skill names. Leave:
the files themselves, `roles`, `programs`. The dataset has **no prerequisite
edges** — the DAG is authored by hand regardless.

## FSRS keyed on skills, not cards

Retention Lab schedules a flashcard. We schedule a *skill*: proficiency decays
and must be re-earned, so "mastered" still means something a month later. No
other team will have spaced repetition, and it maps to SDG 4 more credibly than
a generated roadmap does.
