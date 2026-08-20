import { z } from "zod";

const Port = z.coerce.number().int().min(1).max(65535);

const DatabaseUrl = z.string().min(1, "must be a postgres connection string");

/**
 * The gateway is the only hop allowed to assert who the caller is. Services
 * are unpublished on the compose network, but network reachability is one
 * mistake away from being wrong — a shared secret makes forged identity
 * headers fail closed instead. No default: a service that starts without it
 * would trust anything that reached it.
 */
const GatewaySecret = z
  .string()
  .min(16, "generate one with: openssl rand -hex 32");

export type ServiceEnv = {
  databaseUrl: string;
  gatewaySecret: string;
  port: number;
};

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parse<T extends z.ZodType>(schema: T, service: string): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `${service}: invalid environment. Copy .env.example to .env and fill in:\n` +
        formatIssues(parsed.error),
    );
  }
  return parsed.data;
}

/** Every backend service reads at least these three. */
export function serviceEnv(service: string, defaultPort: number): ServiceEnv {
  const data = parse(
    z.object({
      DATABASE_URL: DatabaseUrl,
      GATEWAY_SECRET: GatewaySecret,
      PORT: Port.default(defaultPort),
    }),
    service,
  );
  return {
    databaseUrl: data.DATABASE_URL,
    gatewaySecret: data.GATEWAY_SECRET,
    port: data.PORT,
  };
}

export type GatewayEnv = {
  gatewaySecret: string;
  port: number;
  authServiceUrl: string;
  profileApiUrl: string;
  skillServiceUrl: string;
  aiServiceUrl: string;
  pythonAnalyzerUrl: string;
};

/**
 * The gateway holds no DATABASE_URL on purpose — it routes and verifies, and
 * a router with database credentials is a router that will eventually query.
 */
export function gatewayEnv(defaultPort: number): GatewayEnv {
  const Url = z.string().url();
  const data = parse(
    z.object({
      GATEWAY_SECRET: GatewaySecret,
      PORT: Port.default(defaultPort),
      AUTH_SERVICE_URL: Url,
      PROFILE_API_URL: Url,
      SKILL_SERVICE_URL: Url,
      AI_SERVICE_URL: Url,
      PYTHON_ANALYZER_URL: Url,
    }),
    "api-gateway",
  );
  return {
    gatewaySecret: data.GATEWAY_SECRET,
    port: data.PORT,
    authServiceUrl: data.AUTH_SERVICE_URL,
    profileApiUrl: data.PROFILE_API_URL,
    skillServiceUrl: data.SKILL_SERVICE_URL,
    aiServiceUrl: data.AI_SERVICE_URL,
    pythonAnalyzerUrl: data.PYTHON_ANALYZER_URL,
  };
}

export type AuthEnv = ServiceEnv & {
  betterAuthSecret: string;
  betterAuthUrl: string;
  trustedOrigins: string[];
};

export function authEnv(defaultPort: number): AuthEnv {
  const data = parse(
    z.object({
      DATABASE_URL: DatabaseUrl,
      GATEWAY_SECRET: GatewaySecret,
      PORT: Port.default(defaultPort),
      BETTER_AUTH_SECRET: z
        .string()
        .min(32, "generate one with: openssl rand -base64 32"),
      BETTER_AUTH_URL: z.string().url(),
      // Comma-separated. The browser only ever sees the public origin, so this
      // is normally just BETTER_AUTH_URL; compose adds the Caddy hostname.
      TRUSTED_ORIGINS: z.string().default(""),
    }),
    "auth-service",
  );
  return {
    databaseUrl: data.DATABASE_URL,
    gatewaySecret: data.GATEWAY_SECRET,
    port: data.PORT,
    betterAuthSecret: data.BETTER_AUTH_SECRET,
    betterAuthUrl: data.BETTER_AUTH_URL,
    trustedOrigins: [
      data.BETTER_AUTH_URL,
      ...data.TRUSTED_ORIGINS.split(",").map((o) => o.trim()),
    ].filter(Boolean),
  };
}
