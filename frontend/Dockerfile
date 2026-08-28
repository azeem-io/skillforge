# syntax=docker/dockerfile:1

# Build from the repo root:
#   docker build -f frontend/Dockerfile .
#
# Two runtimes, deliberately. Bun installs — it is the package manager and the
# only thing that reads bun.lock. Node builds and serves, because `next build`
# segfaults on the Bun runtime (SIGILL, Bun 1.3.14; see docs/decisions.md).

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
RUN bun install --frozen-lockfile --linker=hoisted

# ----------------------------------------------------------------------- build
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY packages ./packages
COPY frontend ./frontend

ENV NEXT_TELEMETRY_DISABLED=1
# next.config.ts compiles its rewrites at build time, so this has to be set
# here, not at runtime. Without it /api/* 404s on the published port 3000.
# Behind Caddy the rewrite is never reached, so it costs nothing there.
ARG GATEWAY_URL=http://api-gateway:8080
ENV GATEWAY_URL=${GATEWAY_URL}
WORKDIR /app/frontend
RUN npx next build

# --------------------------------------------------------------------- runtime
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next's standalone server binds to HOSTNAME, which defaults to the container's
# own name — reachable from nowhere. Without this the app looks healthy from
# inside and refuses every connection from outside.
ENV HOSTNAME=0.0.0.0

# The standalone output keeps the monorepo layout, so the server lives at
# frontend/server.js inside it and static assets have to be placed by hand.
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
# public/ is not part of the standalone output either. It holds og.png, which
# every link preview of the site resolves against.
COPY --from=build /app/frontend/public ./frontend/public

USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
