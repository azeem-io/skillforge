import {
  health,
  identity,
  notFound,
  onError,
  requestLog,
} from "@skillforge/service-kit";
import { Hono } from "hono";

import { env, type Vars } from "./context";
import { assessmentRoutes } from "./routes/assessments";
import { progress } from "./routes/progress";
import { resourceRoutes } from "./routes/resources";
import { reviewRoutes } from "./routes/review";
import { roadmapRoutes } from "./routes/roadmap";
import { taxonomy } from "./routes/taxonomy";

const SERVICE = "skill-service";

const app = new Hono<Vars>();

app.use("*", requestLog(SERVICE));
app.use("*", identity(env.gatewaySecret));
app.onError(onError(SERVICE));
app.notFound(notFound);

health(app, SERVICE);

app.route("/api/skills", taxonomy);
app.route("/api/skills", assessmentRoutes);
app.route("/api/skills", progress);
app.route("/api/skills", resourceRoutes);
app.route("/api/skills", reviewRoutes);
app.route("/api/skills", roadmapRoutes);

console.log(
  `[${SERVICE}] listening on :${env.port}` +
    (env.pythonAnalyzerUrl
      ? `, analyzer at ${env.pythonAnalyzerUrl}`
      : ", no analyzer configured (roadmap uses the local layering)") +
    (env.aiServiceUrl
      ? `, ai-service at ${env.aiServiceUrl}`
      : ", no ai-service configured (roadmaps save without narration)"),
);

export default { port: env.port, fetch: app.fetch };
