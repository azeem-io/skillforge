import {
  gatewayEnv,
  health,
  notFound,
  onError,
  requestLog,
} from "@skillforge/service-kit";
import { Hono } from "hono";

import { forward } from "./proxy";
import { resolveIdentity } from "./session";

const SERVICE = "api-gateway";

const env = gatewayEnv(8080);
const app = new Hono();

app.use("*", requestLog(SERVICE));
app.onError(onError(SERVICE));
app.notFound(notFound);

health(app, SERVICE);

/**
 * The routing table from the requirements diagram. The frontend knows these
 * five prefixes and no service hostnames at all, which is the whole point of
 * the gateway existing.
 *
 * No CORS: the browser only ever sees one origin. Next rewrites `/api/*` to
 * here in local dev, and Caddy splits the two in compose. A cross-origin
 * gateway would need SameSite=None cookies, which need TLS, which would make
 * a plain `docker compose up` unable to sign anyone in.
 */
const ROUTES: Record<string, string> = {
  "/api/auth": env.authServiceUrl,
  "/api/profile": env.profileApiUrl,
  "/api/skills": env.skillServiceUrl,
  "/api/analysis": env.pythonAnalyzerUrl,
  "/api/ai": env.aiServiceUrl,
};

for (const [prefix, target] of Object.entries(ROUTES)) {
  app.all(`${prefix}/*`, async (c) => {
    // Verified once, here. Services re-check what a given identity is allowed
    // to touch, but none of them re-verify who it is.
    const identity = await resolveIdentity(
      c.req.raw,
      env.authServiceUrl,
      env.gatewaySecret,
    );
    return forward(c, target, identity, env.gatewaySecret);
  });
}

console.log(`[${SERVICE}] listening on :${env.port}`);
for (const [prefix, target] of Object.entries(ROUTES)) {
  console.log(`[${SERVICE}]   ${prefix}/* -> ${target}`);
}

export default { port: env.port, fetch: app.fetch };
