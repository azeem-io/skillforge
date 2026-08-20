#!/bin/sh
# Applies migrations, then seeds the taxonomy unless told not to. Seeding is
# idempotent — every insert upserts on a natural key — so running it on each
# boot updates the catalogue rather than duplicating it.
set -eu

cd /app/packages/db

echo "migrate: applying migrations"
bun src/migrate.ts

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "migrate: seeding reference data"
  bun src/seed/index.ts
else
  echo "migrate: SEED_ON_START is not true, skipping seed"
fi

echo "migrate: done"
