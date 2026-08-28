# Features — what exists, and what we could build next

The standing list of what the app could become. `docs/status.md` says what is
built and who owns it; `TODO.md` is the short pre-submission punch list. **This
file is the long view** — keep ideas here so they survive the hackathon and so
nobody re-proposes something we already rejected.

Every idea carries an honest **cost** and **payoff**, because the useful
question is never "is this good?" but "is this the best next hour?".

Cost is rough build time for one person who knows the codebase:
**S** under an hour · **M** a few hours · **L** a day or more.

---

## Shipped

What a judge can already do, end to end, against a real account.

| Feature | Where |
|---|---|
| Register, sign in, three roles | `/register`, `/login` → auth-service, argon2id |
| Student profile, projects, certifications | `/profile` → profile-api |
| CV upload with inline preview (pdf/png/jpeg) | `/profile`, sandboxed frame |
| Self-reported skill claims | `/profile`, `source: self_reported` |
| Assessments — recall, cloze, MCQ, with search | `/assessments`, 15 sittings / 8 areas, 150 questions |
| Per-skill breakdown, worst-first | `/assessments/attempts/[id]` |
| FSRS spaced repetition | `skill_state`, `skill-service/src/scheduler.ts` |
| Skill graph — prerequisite DAG | `/graph`, React Flow + elk |
| Skill tree — the whole taxonomy | `/tree`, d3 circle packing |
| Roadmap — layered, persisted, archived on regen | `/roadmap` → python-analyzer `/plan` |
| RAG assistant with cited sources, retry on failure, past-chat switcher | `/assistant` → ai-service `/chat` |
| Career agent, 6 tools | ai-service `/agent` |
| Mentor and admin dashboard | `/students`, role + mentorship management |
| Staff curate the resource library | `/resources`, mentor/admin only, `skill-service` |
| Roadmap narration and per-phase rationale, written by DeepSeek | `/roadmap` → ai-service `/narrate` |
| Assessment history and per-skill breakdown in the mentor view | `/students/[userId]` → `GET /api/skills/students/:userId/attempts` |
| A populated demo student, mentor and admin | `bun run db:seed:demo`, `SEED_DEMO` in compose |
| Compose, Kubernetes (every service), Terraform | `docker-compose.yml`, `kubernetes/`, `terraform/` |
| Deployed and reachable | <https://skillforge.sudobox.tech>, Coolify on the Contabo VPS |
| Compare every role side by side | `/compare` → python-analyzer `/compare` |
| Command palette — skills, assessments, roles, pages | ⌘K or `/`, `components/layout/command-palette.tsx` |
| Light / dark / system theme | Sidebar footer, landing and auth pages |
| Assessment stopwatch, and the duration on the result | `/assessments/[slug]`, `/assessments/attempts/[id]` |

---

## Next up — high payoff, small cost

**Demo video** · M
2–3 minutes, named in the PDF's submission list. The presentation is done —
`presentation.html`, a self-contained 16-slide deck following the PDF's own
8-point outline. The recording is the last thing outstanding.

---

## Worth building

**Assessment authoring for staff** · L
The PDF's Core Users says mentors and admins create assessments. The resource
half is done; question authoring is a real form with validation against the
skill taxonomy. Large build, modest marginal credit — deliberately skipped for
the hackathon, but it is the honest gap against the brief.

**Retake pressure from FSRS** · M
`skill_state.due` already schedules every demonstrated skill, and
`GET /progress/due` already answers. Nothing surfaces it: no "3 skills due for
review" on the dashboard, no nudge. The engine is running with nobody watching.

**Evidence links on skill claims** · S
`student_skills.evidence` is a free-text column that the UI never collects. A
claim backed by a repo URL reads very differently to a mentor than a bare
self-rating.

**Project → skill inference** · M
`project_skills` exists and is only ever written by hand. Feeding a project's
description to ai-service and proposing skills — as suggestions the student
confirms, marked with `--ai` gold — is the kind of thing the AI is actually for.

**Export the roadmap** · S
A PDF or Markdown export of the current roadmap. Students want something to keep;
it is also the most shareable artefact the app produces.

---

## Polish

Done, and what each one turned out to actually be:

- ~~**Search across the app**~~ — shipped as the ⌘K palette. Skills route to
  `/tree?q=`, which seeds the tree's own search rather than adding a second one.
  Roles are not a page, so choosing one sets the goal and opens the roadmap.
- ~~**Empty states everywhere**~~ — shipped as one `EmptyState`. The work was
  not adding them; most existed, in three different visual idioms.
- ~~**Assessment timer**~~ — shipped as a stopwatch seeded from
  `attempts.started_at`, plus the duration on the result card. The note here
  said `attempt_answers.elapsed_ms`; that column is on `reviews`, not
  `attempt_answers`, so per-question timing would need a migration. Per-sitting
  timing needed none.
- ~~**Dark mode audit**~~ — the audit's finding was that the full dark palette
  and every `dark:` variant were already there and **nothing ever set the
  `.dark` class**, so none of it was reachable. Shipped a three-way toggle with
  a pre-paint script.
- ~~**Keyboard shortcuts**~~ — ⌘K and `/` open the palette; `/` yields when the
  caret is in a field. Not the `g`-then-`g` chords: with nine destinations one
  searchable list beats nine bindings nobody memorises.
- ~~**Mobile pass on `/graph` and `/tree`**~~ — the 20rem skill panel became a
  bottom sheet under `sm`, the legend scrolls instead of overflowing, the tree's
  breadcrumb yields width to the search cluster, and React Flow's controls get
  32px targets on a coarse pointer.

Still open:

- **Empty states on the canvas views** · S — `/graph` and `/tree` render a
  correct but bleak all-gaps picture for a brand-new account. `FirstSteps` does
  this job on the dashboard and could be lifted.
- **Real device pass** · S — the above was done against viewport emulation.
  Nobody has held a phone.

---

## Deliberately not doing

Read before re-proposing. Longer rationale in `docs/decisions.md`.

| Idea | Why not |
|---|---|
| Real CI/CD pipeline | Bonus, not mandatory; `docs/cicd.md` covers the requirement |
| pgvector for RAG | 140 chunks — a linear scan beats a round trip. Revisit past a few hundred |
| De-duplicating TS/Python gap logic | Known, documented, they agree today; skill-service already prefers the analyzer |
| Tightening auth rate limits | Loose is the right failure mode while judging |
| Broadening past tech careers | The brief says technology; the graph is more convincing dense and narrow |
| Letting an LLM order roadmap phases | Ordering is a topological sort. A model writes prose, never structure |

---

## How to use this file

- Adding an idea: put it under the right heading with a cost and one sentence on
  why it matters. No entry without a payoff.
- Starting one: move it to `TODO.md` with the concrete file paths, and note the
  owner in `docs/status.md`.
- Rejecting one: move it to **Deliberately not doing** with the reason. A
  rejected idea with a reason is worth more than a deleted one.
