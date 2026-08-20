-- Hand-edited: drizzle-kit generates a bare `ADD COLUMN ... NOT NULL`, which
-- fails on any database that already has an accounts row. Every account
-- written before Better Auth 1.7 was a credentials account — no OAuth provider
-- is configured — so backfilling them with the synthetic local issuer is exact,
-- not a guess. The default is dropped again so Better Auth has to supply the
-- value on every future write, which is what the snapshot records.
ALTER TABLE "accounts" ADD COLUMN "issuer" text NOT NULL DEFAULT 'local:credential';--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP DEFAULT;
