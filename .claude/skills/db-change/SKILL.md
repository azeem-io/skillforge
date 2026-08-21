---
name: db-change
description: Use when changing the Drizzle schema in packages/db — adding or altering a table, column, enum, index or constraint. Covers generating the migration and verifying it against a real Postgres before committing.
---

# Changing the schema

Announce the change first — both people depend on `packages/db`.

## Steps

1. Edit the relevant file in `packages/db/src/schema/`. One domain per file:
   `auth`, `skills`, `profile`, `assessment`, `progress`, `roadmap`.
2. Every column names its own database identifier explicitly. There is no
   global `casing` rule, so drizzle-kit and the runtime client cannot drift.
3. Timestamps are always `withTimezone: true`. Mixing timestamptz and timestamp
   makes cross-table comparisons silently wrong.
4. Typecheck: `npm run typecheck -w @skillforge/db`
5. Generate: from `packages/db`,
   `DATABASE_URL=postgres://skillforge:dev@localhost:5432/skillforge npx drizzle-kit generate --name <short_name>`
6. **Verify against a real Postgres.** Typechecking does not prove a check
   constraint is valid SQL or that a self-referencing FK resolves.

## Verification loop

```bash
docker run -d --name sf-pgtest \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_USER=skillforge -e POSTGRES_DB=skillforge \
  -p 55432:5432 pgvector/pgvector:pg17

DATABASE_URL="postgres://skillforge:dev@localhost:55432/skillforge" \
  node --experimental-strip-types src/migrate.ts
```

Then prove the constraint bites — insert a row that should fail and confirm it
does. `docker exec -i` (not plain `exec`) if piping SQL via heredoc.

```bash
docker rm -f sf-pgtest
```

## Constraints that cannot live in SQL

Enforce these on write in the core service, not with a check constraint:

- prerequisite edges connect leaves only (`altitude = 'SKILL'`)
- the prerequisite graph stays acyclic

`SkillGraph.validate()` in the Python service is the backstop for both.

## Gotchas

- `prepare: false` is the default in `createDb`. Pooled connections run in
  transaction mode where prepared statements fail, and only under concurrency.
- The Better Auth tables are generated output adopted as source. If they are
  ever regenerated, re-apply: the `user_role` pgEnum, `withTimezone` on every
  timestamp, and the `rateLimits` table with its `id` column.
