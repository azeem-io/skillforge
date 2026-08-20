import {
  health,
  identity,
  notFound,
  onError,
  requestLog,
} from "@skillforge/service-kit";
import { Hono } from "hono";

import { env, type Vars } from "./context";
import { portfolio } from "./routes/portfolio";
import { profile } from "./routes/profile";
import { uploadRoutes } from "./routes/uploads";

const SERVICE = "profile-api";

const app = new Hono<Vars>();

app.use("*", requestLog(SERVICE));
app.use("*", identity(env.gatewaySecret));
app.onError(onError(SERVICE));
app.notFound(notFound);

health(app, SERVICE);

// The gateway forwards the path unchanged, so the prefix here is the same one
// the browser asked for. Nothing rewrites a URL anywhere along the chain.
app.route("/api/profile", profile);
app.route("/api/profile", portfolio);
app.route("/api/profile", uploadRoutes);

console.log(`[${SERVICE}] listening on :${env.port}, uploads in ${env.uploadDir}`);

export default { port: env.port, fetch: app.fetch };
