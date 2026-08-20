# syntax=docker/dockerfile:1

# Migrations run in their own container, to completion, before any service
# starts — never as part of one. Migrating on boot means every replica races to
# migrate, and a failed migration takes the app down instead of stopping the
# deploy.

FROM oven/bun:1-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/service-kit/package.json ./packages/service-kit/
COPY frontend/package.json ./frontend/
COPY backend/api-gateway/package.json ./backend/api-gateway/
COPY backend/auth-service/package.json ./backend/auth-service/
COPY backend/profile-api/package.json ./backend/profile-api/
COPY backend/skill-service/package.json ./backend/skill-service/
# --linker=hoisted, not Bun's default isolated layout. Isolated puts every
# package in node_modules/.bun and fills each workspace with symlinks into it;
# Next's file tracer cannot follow that, and the standalone output comes out
# missing @swc/helpers, which fails at container start rather than at build.
# A hoisted tree is the flat npm-shaped layout every tool already understands.
RUN bun install --frozen-lockfile --linker=hoisted

FROM oven/bun:1-slim AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY packages ./packages
COPY docker/migrate.sh ./docker/migrate.sh

USER bun
ENTRYPOINT ["/app/docker/migrate.sh"]
