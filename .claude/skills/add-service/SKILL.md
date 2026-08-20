---
name: add-service
description: Use when adding a backend service or wiring an existing one into the gateway, compose file or Kubernetes manifests. Keeps the five services consistent so the architecture diagram stays true.
---

# Adding or wiring a service

The submission is graded on an architecture a judge will ask you to explain.
Every service must be a real container that actually runs, reachable through
the gateway, and present in all four places below. A service missing from any
one of them is worse than not having it.

## The five services

| Service | Language | Owns |
|---|---|---|
| `api-gateway` | Node | Routing, JWT verification, forwarding user context |
| `auth-service` | Node | Better Auth, argon2id, users/sessions/roles |
| `core-service` | Node | Skills, assessments, progress, roadmaps |
| `python-service` | FastAPI | SkillGraph, SkillGapCalculator, RoadmapGenerator |
| `ai-service` | FastAPI | DeepSeek calls, RAG retrieval, the agent and its tools |

## Checklist — all four, or it does not count

1. **Dockerfile** in the service directory. Multi-stage for Node.
2. **`docker-compose.yml`** entry: `depends_on` with `condition: service_healthy`
   where it matters, a healthcheck, and no `ports:` unless the gateway or Caddy
   needs to reach it from outside the compose network.
3. **Gateway route**: a path prefix in `api-gateway` that forwards to it. The
   frontend never calls a service directly.
4. **`kubernetes/`**: a Deployment and a Service manifest. Validate with
   `kubectl apply --dry-run=client -f`. Cluster deployment is optional; correct
   manifests are not.

## Gateway conventions

- The gateway verifies the session once and forwards identity as headers.
  Downstream services trust those headers and do not re-verify the JWT, but
  **do** re-check authorization at the data layer.
- Path prefixes: `/api/auth/*`, `/api/skills/*`, `/api/analysis/*`, `/api/ai/*`.
- Every service exposes `GET /health` returning 200 and nothing sensitive.

## Python services

- FastAPI, class-based domain logic. The classes are the deliverable — the
  hackathon asks for real OOP, not a script behind a route handler.
- Keep the HTTP layer thin: a route parses input, calls a method, returns.
  Domain classes must be unit-testable without FastAPI.
- Pin dependencies in `requirements.txt`.

## Environment

Every new variable is added to `.env.example` in the same commit. A service
that reads an undocumented variable will fail on someone else's machine and on
deploy.
