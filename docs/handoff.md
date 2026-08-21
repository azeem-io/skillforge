# Handoff

Read this first if you're picking this repo up mid-stream — a new Claude Code
session, a different machine, or a different account on the same machine.
Then `CLAUDE.md` for the hard rules, `docs/status.md` for what's built,
`docs/features.md` for the backlog, `docs/decisions.md` for settled calls.
This file is a snapshot, not a standing doc — the next session that ships
something should update it or delete it, not let it go stale.

## Last shipped (uncommitted in the working tree, 2026-08-21)

Four items off the previous handoff's list. All four are verified against the
running system, not just typechecked.

1. **A populated demo account.** `bun run db:seed:demo` →
   `packages/db/src/seed/demo.ts`. A student with four graded sittings, a
   portfolio and a roadmap; a mentor joined to them by a `mentorships` row; an
   admin. **demo@ / mentor@ / admin@example.com, password
   `skillforge-demo-2026`.** It reimplements nothing — auth-service's
   `hashPassword`, skill-service's grader and FSRS scheduler, and the same
   `phases()` the roadmap route uses, which is why `gapScore` / `phaseTitle` /
   `phaseWeeks` moved into `packages/db` beside it. Runs from `setup.sh` and
   from the migrate container, gated on `SEED_DEMO` (default true; the password
   is public, so turn it off for anything real). Verified: idempotent across
   re-runs, all three accounts sign in against auth-service, and it runs inside
   the built migrate image.

2. **Roadmap narration and phase rationales.** ai-service `/narrate` writes
   `roadmaps.narration` and `roadmap_phases.rationale` and nothing else;
   `backend/skill-service/src/narrator.ts` calls it after the phases are
   settled, on a 20s budget, and fails soft. Verified against the live DeepSeek
   API — a seven-phase plan narrated in about 5s — and on the failure path,
   where an unreachable ai-service still saves the roadmap in 0.3s with
   `narrated: false`. The prose renders in the `--ai` gold block on `/roadmap`.

3. **The two missing Kubernetes manifests.** `06a-python-analyzer.yaml`,
   `06b-ai-service.yaml`, plus two NetworkPolicies for the AI tier.
   `kubeconform -strict` against 1.31: 26 resources in 14 files, all valid.
   ai-service runs one replica with a five-minute startupProbe, because each
   replica embeds the corpus at boot and shares nothing with the others.

4. **Assessment results in the mentor view.** `/students/[userId]` now renders
   the student's sittings and the per-skill breakdown of the most recent, via
   `GET /api/skills/students/:userId/attempts`. The mentorship rule now lives
   once, in `canReadStudent` in `packages/db/src/queries/access.ts`, and both
   profile-api and skill-service enforce it. Verified through the rendered
   page as the demo mentor, and on every authorization path: mentor with a
   row 200, admin 200, mentor without a row 403, another student 403,
   anonymous 401.

Checks at the time of writing: `bun run typecheck` clean, ai-service 57 tests,
python-analyzer 37 tests, `docker compose --profile edge config -q` clean.

**Concurrent work.** Two other sessions were in this same working tree. One
landed `2ca4600` (seven more assessments, six new RAG skill docs, a
self-updating assessment catalogue for the assistant); the other was building
`frontend/app/page.tsx` into a landing page and had already landed the
Coolify-ready compose, the CI gates and `docs/deploy.md`. Check `git log` and
`docs/status.md`'s "Last updated" line before assuming anything here is the
newest state.

## What's left, in priority order

1. **Deploy to Coolify** (M) — `docs/deploy.md` is the runbook and the compose
   file is Coolify-ready; what is missing is a URL a judge can open. Needs the
   VPS and the Coolify credentials, so it cannot be done from a session alone.
   With `SEED_DEMO=true` the deployed instance comes up populated.
2. **Demo video (2–3 min) and presentation (5–7 min)** (M) — both named in the
   PDF's submission list; its 8-point outline is in `TODO.md`.

After those, `docs/features.md` → "Worth building" is the queue. The honest
gap against the brief is assessment authoring for staff: the PDF's Core Users
says mentors and admins create assessments, and only the resource half is
built.

Before starting any of these: `docs/decisions.md` has settled calls (why
pgvector isn't used, why auth rate limits stay loose, why a model never orders
roadmap phases) — don't re-propose something already rejected there.
