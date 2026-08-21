# SkillForge — remaining work (PS-03)

Audited against the requirements PDF, most recently 2026-08-21 — see
"Submission checklist" below for the full deliverable-by-deliverable pass.
Deploy, demo video and presentation are handled separately — not in this list.

## P0 — the real functional gap

- [x] **The assistant has no idea you took an assessment** — done, both the
      cheap fix and the agent tool.

      What it got before this: `lib/ai-context.ts` → `assistantStudent()` returned only
      `{ roleSlug, demonstrated }`, and both `/ai/chat` and `/ai/agent` send
      `context: { demonstrated, target_role }`. `demonstrated` is a flat
      `slug → level` map from `roleGraph()`.

      So it knew you're level 2 at NumPy. It did NOT know:
      - that an assessment happened at all, or when
      - the score (`attempts.score` / `maxScore`)
      - the per-skill breakdown — which areas were weakest
      - which questions were missed, or the explanations for them
      - whether a level came from a test or a self-reported claim
        (`studentSkills.source` never reaches it)
      - what's due for review on the FSRS schedule

      Why it matters: the most natural thing a judge does after finishing the
      assessment is ask the assistant about it. "How did I do?", "What did I get
      wrong?", "What should I review first?" all got generic answers. Worse, it
      would confidently restate a level without knowing whether it came from a
      test five minutes ago or a self-claim three weeks ago.

      The data already exists — no schema change needed:
      - `GET /api/skills/attempts` → last 50, as
        `{ id, slug, title, score, maxScore, completedAt }`
      - `GET /api/skills/attempts/:id` → `{ attempt, answers, breakdown }`,
        where `breakdown` is per-skill `{ slug, name, correct, total, level }`
        and is **already sorted worst-first**

      Cheapest fix (~1 hr):
      - [x] `lib/ai-context.ts` — `assistantStudent()` now also returns
            `recentAssessments`: the last 3 completed attempts, the newest one
            carrying the 3 weakest skills off its breakdown. Wrapped in a
            try/catch — a skill-service hiccup must not stop the assistant
            answering. `AttemptSummary` added to `lib/assessment-types.ts`.
      - [x] `ai-service/main.py` — `recent_assessments` on `StudentContext`,
            modelled as `AssessmentRecap` with camelCase aliases so the wire
            shape stays what the frontend already speaks
      - [x] `ai-service/main.py` — `assessment_summary()` renders one line per
            sitting into `student_summary()`; levels and assessments are now
            independent, so an attempt shows up even with no target role
      - [x] `CHAT_SYSTEM` — answers about how they did come from the results,
            plus "say they have not taken one" instead of inventing a score
      - [x] 5 tests in `ai-service/tests/test_context.py` (33 -> 38)
      - [x] The better version too: a 6th agent tool `get_assessment_history`.
            `/agent` is sent `recent_assessments` in its context but never
            renders it into the prompt — it reads the attempts through the tool,
            so a conversation that never asks about a score never pays for one.
            Tool counts corrected in README.md, CLAUDE.md, docs/api.md,
            docs/status.md and ai-service/README.md (five -> six), and the
            `ToolBox` docstring's stale "three call python-analyzer" is now
            four. 45 tests passing.

## P1 — worth doing

- [x] Let mentors/admins create learning resources. PDF Core Users says mentor/
      admin can "create learning resources, create assessments, and recommend
      resources". Shipped and committed (`3d2e15c`) —
      `backend/skill-service/src/routes/resources.ts` (GET/POST/DELETE),
      `frontend/app/(app)/resources/page.tsx`,
      `frontend/components/staff/resource-library.tsx`, `frontend/lib/resources.ts`,
      plus edits to `skill-service/src/index.ts`, `app-sidebar.tsx` and
      `lib/student.ts`. Assessment authoring stays out of scope; big build,
      little credit.
- [x] Update docs/status.md — rewritten 2026-08-21 against the running system.
      Every count re-derived (seed from Postgres, tests from pytest, endpoints
      from the routers); several inherited numbers were wrong and are fixed.
- [x] status.md agent tool count 4 -> 5. Same error also fixed in
      `ai-service/README.md`, which was missing `compare_target_roles` from its
      tool table. Still stale in code: the `ToolBox` docstring in
      `ai-service/service/tools.py:29` says "three call python-analyzer" — it is
      four. Azeem's file, left alone.
- [x] Seed a populated demo account so a fresh instance isn't empty for judges —
      `bun run db:seed:demo` (`packages/db/src/seed/demo.ts`). A student with
      four graded sittings, a mentor joined to them and an admin, at
      demo@ / mentor@ / admin@example.com, password `skillforge-demo-2026`.
      Nothing is reimplemented: auth-service's `hashPassword`, skill-service's
      grader and FSRS scheduler, and the same `phases()` the roadmap route
      uses. Runs from `setup.sh` and from the migrate container, gated on
      `SEED_DEMO`. Verified inside the built migrate image against Postgres.
- [x] Two setup.sh bugs from PR #6 — both fixed and tested against four
      DATABASE_URL shapes (with port, without, with query string, passwordless).
      Password drift now guarded the same way the port already was, by comparing
      `docker inspect` against .env.
- [x] A .jpeg or pdf preview for CV — shipped (`6772f9a`),
      `components/profile/cv-preview.tsx`, sandboxed iframe for pdf, `<img>`
      for images

## P2 — small polish, drop freely

- [x] **Let the assistant link straight to an assessment.** Took the cheap route:
      the six slugs are listed in `CHAT_SYSTEM` with an instruction to emit
      `[the Python assessment](/assessments/python-fundamentals)` and never to
      invent a slug. The gotcha is fixed too — `components/ai/answer.tsx` now
      branches on `href.startsWith("/")` and routes internal links through
      next/link, so they keep SPA navigation instead of opening a new tab.

- [x] Enter key advances to the next question in the assessment, and submits on
      the last one. Held on the wrapper so it covers the radio group too.
- [x] Autofocus the answer input on each question
- [x] Enter submits on the login/register forms — already worked: `<form onSubmit>`
      plus an explicit `type="submit"` button submits on Enter natively. Verified,
      no change needed.
- [x] Add `app/not-found.tsx` and `app/error.tsx`
- [x] Add `loading.tsx` for the slow pages (/roadmap, /assistant)
- [x] Replaced the favicon — `app/icon.svg` instead of a binary `.ico`
- [x] Deleted the create-next-app leftovers in `public/` (all five svgs)
- [x] Per-page metadata titles on all eight app pages
- [x] Mobile: `100vh` -> `100dvh` on /graph, /tree, /roadmap and /assistant —
      with `vh` the canvas is taller than the visible viewport while a mobile
      browser's URL bar is showing. A real device pass is still unticked; see
      `docs/features.md` under Polish.

## Submission checklist — audited against the LoopLab PDF (2026-08-21)

Re-read `Skillforge.pdf` in full (Hackathon Format, PS-03's own spec, the
Submission Structure, the Final Submission Checklist and the judging rubric)
and walked every line against the running repo. This is the one place that
maps every PDF-named deliverable to its actual state — items already tracked
elsewhere just point there instead of duplicating.

**Missing outright:**
- [ ] **Live application / deployment URL.** The PDF lists it under both
      "Submission for PS-03" and the Final Checklist's DevOps section.
      Tracked in `docs/status.md` → Next, as "Deploy to Coolify — Awaim".
- [ ] **Demo video (2–3 min) and presentation (5–7 min).** Both named in the
      Submission list and the Documentation checklist; the PDF gives the
      8-point presentation outline (problem → SDG → solution → live demo →
      AI/RAG/Agent → architecture → DevOps → future potential). Tracked in
      `docs/status.md` → Next. Neither exists yet — no slides, no recording.
- [x] **LICENSE file.** The Submission Structure's repo tree names it
      explicitly; `package.json` already declared `"license": "MIT"` with
      nothing to back it. Added `LICENSE` (MIT) at the repo root.

**Partially met:**
- [x] **Kubernetes manifests.** Now cover every service in the compose file:
      `kubernetes/06a-python-analyzer.yaml` and `06b-ai-service.yaml` added,
      plus two NetworkPolicies for the AI tier. ai-service runs one replica
      with a 5-minute startupProbe, because each replica embeds the corpus at
      boot and shares nothing. `kubeconform -strict` against 1.31: 26
      resources in 14 files, all valid.
- [x] **Architecture diagram / database schema as image files.** Shipped as
      PDFs rather than PNGs — `docs/architecture.pdf`,
      `docs/database-schema.pdf` and `docs/api.pdf`, rendered from the
      markdown with the mermaid diagrams drawn, so a judge reading offline
      gets the diagrams and the prose in one file. Original note below.
- [~] **Architecture diagram / database schema as image files.** The
      Submission Structure's tree names `docs/architecture.png` and
      `docs/database-schema.png` specifically; we instead have the same
      content as `mermaid` blocks inside `docs/architecture.md` and
      `docs/schema.md`, which GitHub renders inline as diagrams. Judges
      reading the repo on GitHub see the actual diagrams either way — this is
      a format mismatch against the PDF's suggested tree, not a missing
      deliverable. Exporting static PNGs alongside the `.md` sources is a
      cosmetic nice-to-have, not a functional gap; low priority.
- [x] **Roadmap narration/rationale prose.** The PDF's own worked Generative AI
      example ("I know Python... what should I learn next?" → "The AI generates
      a roadmap") now actually generates prose. ai-service `/narrate` writes
      `roadmaps.narration` and `roadmap_phases.rationale` after the phases are
      settled, and nothing else; skill-service calls it on a 20s budget and
      fails soft. Verified against the live DeepSeek API — a seven-phase plan
      narrated in about 5 seconds.

**Explicitly approved deviation, now written down where a judge can find it:**
- [x] **MongoDB → PostgreSQL.** The PDF's *generic* cross-problem-statement
      architecture diagram names MongoDB; PS-03's own service diagram doesn't
      name a database at all, and that's the one `docs/architecture.md` and
      `CLAUDE.md` say we match exactly. Organizers gave explicit permission to
      substitute a different data store that does the same job. Recorded in
      `docs/decisions.md` under "Database: self-hosted Postgres, not
      Supabase" so it reads as a documented, approved call rather than a
      silent requirement miss.

**Docs corrected today, no longer contradicting the running system:**
- `docs/architecture.md` — the system diagram marked `ai-service` and
  `python-analyzer` as dashed/"not built yet" and drew both writing to
  Postgres; neither has been true for a while (both are fully built per
  `docs/status.md`, and neither service holds a `DATABASE_URL`).
- `docs/status.md` — "In progress" still listed the mentor/admin resource
  library as uncommitted (it shipped in `3d2e15c`); "Next" still listed the
  assistant's assessment-awareness work as undone (it's the completed P0 item
  above) and CV preview as unbuilt (shipped in `6772f9a`).
- `docs/features.md` / `README.md` — both said "six areas, sixty questions"
  for `/assessments`; now eight areas / eighty questions, matching the new
  Data Analysis and Cloud & Security assessments added alongside this audit.

Rubric-wise, none of the above touches the largest line items (Core
Functionality 20, AI/RAG/Agentic 30, Docker+K8s+Terraform 10). The two-service
Kubernetes gap and the roadmap prose are both closed; what remains is the
deploy/video/presentation trio everyone already knows about.

## Deliberately not doing

- Real CI/CD pipeline — PDF says bonus, not mandatory; docs/cicd.md covers the requirement
- Tightening auth rate limits — loose is the right failure mode during judging
- De-duplicating the TS/Python gap logic — known, documented, they agree today
- Assessment authoring UI — big build, small marginal credit
