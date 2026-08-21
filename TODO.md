# SkillForge — remaining work (PS-03)

Audited against the requirements PDF. 18 deliverables: 12 done, 3 partial, 3 missing.
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

- [~] Let mentors/admins create learning resources. PDF Core Users says mentor/
      admin can "create learning resources, create assessments, and recommend
      resources". **Built, not yet committed** — in the working tree as
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
- [ ] Seed a populated demo account so a fresh instance isn't empty for judges
- [x] Two setup.sh bugs from PR #6 — both fixed and tested against four
      DATABASE_URL shapes (with port, without, with query string, passwordless).
      Password drift now guarded the same way the port already was, by comparing
      `docker inspect` against .env.
- [ ] A .jpeg or pdf preview for CV etc

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

## Deliberately not doing

- Real CI/CD pipeline — PDF says bonus, not mandatory; docs/cicd.md covers the requirement
- Tightening auth rate limits — loose is the right failure mode during judging
- De-duplicating the TS/Python gap logic — known, documented, they agree today
- Assessment authoring UI — big build, small marginal credit
