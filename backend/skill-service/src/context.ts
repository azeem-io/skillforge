import { createDb } from "@skillforge/db";
import { serviceEnv, type IdentityVars } from "@skillforge/service-kit";

export const env = {
  ...serviceEnv("skill-service", 8083),
  // Optional: the roadmap falls back to a local layering when it is unset or
  // unreachable. See src/roadmap.ts.
  pythonAnalyzerUrl: process.env.PYTHON_ANALYZER_URL ?? "",
};

export const db = createDb(env.databaseUrl);

export type Vars = IdentityVars;
