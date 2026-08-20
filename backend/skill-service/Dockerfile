# syntax=docker/dockerfile:1

# Build from the repo root, not from this directory:
#   docker build -f backend/skill-service/Dockerfile .
# The service imports workspace packages, and bun.lock only resolves with every
# workspace manifest present.

# ---------------------------------------------------------------- dependencies
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
# --production drops devDependencies. Nothing here imports them: Bun runs
# TypeScript directly, so typescript and @types/bun are build-time only, and
# migrate.sh calls bun src/migrate.ts rather than drizzle-kit.
RUN bun install --frozen-lockfile --linker=hoisted --production

# -------------------------------------------------------------------- runtime
# No build stage: Bun runs TypeScript directly, so there is nothing to compile.
FROM oven/bun:1-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules

COPY package.json bun.lock ./
COPY packages/service-kit ./packages/service-kit
COPY packages/db ./packages/db
COPY backend/skill-service ./backend/skill-service

USER bun
WORKDIR /app/backend/skill-service

EXPOSE 8083
CMD ["bun", "src/index.ts"]
