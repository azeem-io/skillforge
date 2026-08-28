# Deploying

**Current deployment: <https://skillforge.sudobox.tech>** — Coolify on the
Contabo VPS, auto-deploying from `main`. The walkthrough below is the general
procedure; where it writes `app.<VPS-IP>.sslip.io` as the domain, that
deployment uses `skillforge.sudobox.tech` instead. `sslip.io` remains the
zero-DNS option for a second environment.

One VPS, one compose file, Coolify in front. The same `docker-compose.yml` that
runs locally runs in production with a different set of environment variables —
there is no separate production configuration to drift.

```
GitHub push to main
   │
   ├─► GitHub Actions  ─ typecheck · pytest ×2 · compose config   (docs/cicd.md)
   │
   └─► Coolify (GitHub app)  ─ clone · docker compose up --build · health-gated
            │
            └─► https://<domain>  ─ Coolify's proxy → frontend:3000 → /api/* → api-gateway
```

Coolify's proxy terminates TLS and owns ports 80/443 on the box, which is why
`caddy` sits behind the `edge` profile and does not start in this mode.

## First deploy

**1. Create the resource.** Coolify → Projects → New → *Docker Compose* (Git
based) → source **GitHub App**, repository `azeem-io/skillforge`, branch `main`,
compose file `/docker-compose.yml`.

**2. Give the frontend a domain.** Coolify lists the services it parsed. Set a
domain on `frontend` only, in Coolify's `domain:port` form so it routes to the
container's port:

```
https://app.<VPS-IP>.sslip.io:3000
```

`sslip.io` resolves any `<ip>.sslip.io` name to that IP, so no DNS is needed
and Let's Encrypt issues a real certificate. Leave every other service without
a domain — they are reachable only on the compose network.

**3. Environment.** Generate it locally and paste the whole block into the
resource's *Environment Variables* (the developer/bulk view accepts `.env`
text):

```bash
./scripts/prod-env.sh app.<VPS-IP>.sslip.io
```

Fresh secrets every run; the DeepSeek key is copied from your local `.env`.
Nothing is written to disk — the deployment is the only place these live.

**4. Deploy.** The first build takes several minutes: eight images, and
`ai-service` bakes the embedding model into its layer so no request ever waits
on a download. Watch the log for `migrate` exiting 0 — it applies migrations
and seeds the taxonomy, and every other service waits on it. `ai-service` has a
60s health budget because it embeds the knowledge base at boot.

**5. Auto-deploy.** With the GitHub App source, Coolify redeploys on every push
to `main` by default — confirm *Auto Deploy* is on under the resource's
settings. CI runs alongside on GitHub; it reports, it does not gate.

**6. First admin.** Everyone registers as a student. Register in the app, then
on the VPS (Coolify keeps the checkout under `/data/coolify/applications/`):

```bash
POSTGRES_CONTAINER=$(docker ps -qf name=postgres) ./scripts/promote.sh you@example.com admin
```

After that, admins promote people from the `/students` roster in the UI.

## Checks

```
https://app.<ip>.sslip.io                      signs in, no certificate warning
https://app.<ip>.sslip.io/api/skills/roles     four roles through the gateway
https://app.<ip>.sslip.io/api/ai/health        llm_configured true, embeddings_ready true
```

Something off after sign-in? The three production auth flags must all be set:
`SITE_ADDRESS=<domain>`, `TRUSTED_ORIGINS=https://<domain>`,
`AUTH_INSECURE_COOKIES=false`. `prod-env.sh` sets all three.

If sign-in rate-limits trip immediately, Coolify's proxy network is outside the
default `TRUSTED_PROXIES` range. Widen it:
`TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16`.

## Every deploy is about two minutes of downtime

Coolify stops the stack and starts it again, and the start order is a chain:
`migrate` → the three data services → `api-gateway` → `frontend`, each waiting
on the previous one's health check. The proxy answers **503** until `frontend`
is healthy, measured at roughly two minutes on the 12 GB box with warm layers.

So: **do not push to `main` during the demo or while judges have the URL.**
Auto-deploy means a docs-only commit restarts production like any other. To
stop that, set *Watch Paths* on the resource in Coolify to the directories that
matter (`frontend/`, `backend/`, `packages/`, `ai-service/`, `python-analyzer/`,
`docker-compose.yml`) so `docs/` pushes are ignored.

## Rollback

Coolify's deployment list redeploys any earlier commit. Migrations are
forward-only, so a rollback keeps the newer schema — every migration so far is
additive, which is what makes that safe.

## Without Coolify

A bare box: `./scripts/setup.sh`, then start with Caddy as the edge so it
terminates TLS itself:

```bash
SITE_ADDRESS=app.<ip>.sslip.io bun run up:edge
```

Caddy issues a real certificate for any public hostname and its own for
`localhost`.

## Port 3000

`frontend` publishes `127.0.0.1:3000:3000` — loopback only. Locally that is
`http://localhost:3000`; on the VPS the raw IP serves nothing on 3000, which is
deliberate. Docker publishes straight past ufw, so the bind address is the
firewall here, not a rule. Coolify's proxy reaches the container over the
compose network and is unaffected.
