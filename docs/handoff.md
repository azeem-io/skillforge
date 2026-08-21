# Handoff

Read this first if you're picking this repo up mid-stream — a new Claude Code
session, a different machine, or a different account on the same machine.
Then `CLAUDE.md` for the hard rules, `docs/status.md` for what's built,
`docs/features.md` for the backlog, `docs/decisions.md` for settled calls.
This file is a snapshot, not a standing doc — the next session that ships
something should update it or delete it, not let it go stale.

## Last shipped (commit `4a64a15`, pushed to `main`)

The assistant had three bugs, reported by the user directly:

1. **Chat history leaked across accounts.** It lived in one unscoped
   `localStorage` key plus a JS module singleton — sign out, sign in as
   someone else in the same tab (a client-side nav, not a reload), and the
   old account's transcript was still there. Fixed by scoping storage per
   `userId` and resetting in-memory state on account mismatch. See
   `frontend/components/ai/chat-store.ts`'s `ensureUser`.
2. **No retry on a failed send.** Added a retry icon on failed turns that
   re-asks the same question in place — no duplicate bubble. See `retry()` in
   the same file, wired into `chat-thread.tsx`.
3. **No session history.** Lightweight version, not full CRUD: "New chat"
   now archives the old thread instead of discarding it; a history icon
   lists past conversations by first-question + relative time, click to
   switch back; "Clear history" wipes the archive. See
   `chat-history-menu.tsx`.

All three verified live via `claude-in-chrome`: two real accounts, sequential
in one browser (that's the actual repro shape — no second browser needed), a
patched `fetch` to force one failure for the retry test. `typecheck` and
`lint` clean.

**Known concurrent work at the time this landed:** another session
(`skillforge-8c`) was in parallel on new assessment categories (Data
Analysis, Cloud & Security), search on `/assessments`, a responsive pass,
self-hosted fonts, and a Dockerfile fix for a build break in
`assistant/page.tsx` (a `"use client"` file can't export `metadata` in
Next 16 — they split it into a server page + `assistant-chat.tsx`, which
this work built on top of rather than redoing). Check `docs/status.md`'s
"Last updated" line and `git log` to see what's landed since.

## What's left, in priority order

Straight from `docs/features.md`'s "Next up" section — read that file for
the full list and the reasoning, this is just the top of it:

1. **Seed a populated demo account** (M) — a fresh instance is empty for any
   judge who doesn't register. Called out there as the single highest-payoff
   item outstanding.
2. **Roadmap narration and phase rationales** (M) — `narration`/`rationale`
   columns are wired end to end and always null. The most visible "the AI
   did something" surface that's paid for and unused.
3. **Deploy to Coolify** (M) — the compose file is the deploy target; until
   a judge can open a URL, deployment is a directory of YAML.
4. **Two Kubernetes manifests** (S) — no `Deployment` for `ai-service` or
   `python-analyzer`, so the assistant/agent/wand/analyzer-backed roadmap
   all fail on Kubernetes.
5. **Assessment results in the mentor view** (S) — the data and the
   authorization both already exist; `/students/[userId]` just doesn't
   render attempts yet.

Before starting any of these: `docs/decisions.md` has settled calls (e.g.
why pgvector isn't used, why auth rate limits stay loose) — don't re-propose
something already rejected there.
