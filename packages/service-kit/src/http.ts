import type { Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export type ErrorBody = { error: string; details?: unknown };

/**
 * One error shape for every service, so the gateway and the frontend parse one
 * thing. Unrecognised throws become a bare 500: an exception message can carry
 * a connection string or a query, and the client has no use for either.
 */
export function onError(service: string) {
  return (err: Error, c: Context): Response => {
    if (err instanceof HTTPException) {
      return c.json<ErrorBody>({ error: err.message }, err.status);
    }
    if (err instanceof z.ZodError) {
      return c.json<ErrorBody>(
        { error: "Invalid request", details: z.treeifyError(err) },
        400,
      );
    }
    console.error(`[${service}]`, err);
    return c.json<ErrorBody>({ error: "Internal error" }, 500);
  };
}

export function notFound(c: Context): Response {
  return c.json<ErrorBody>({ error: "Not found" }, 404);
}

/** `GET /health` — 200 and nothing sensitive, per the add-service checklist. */
export function health(app: Hono<any>, service: string): void {
  app.get("/health", (c) => c.json({ ok: true, service }));
}

/** Parses a JSON body, turning a schema failure into a 400 rather than a 500. */
export async function body<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Expected a JSON body" });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: "Invalid request",
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** Same, for query strings. */
export function query<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid query" });
  }
  return parsed.data;
}

/** Logs method, path and duration. Deliberately never logs bodies. */
export function requestLog(service: string) {
  return async (c: Context, next: () => Promise<void>) => {
    const started = performance.now();
    await next();
    const ms = (performance.now() - started).toFixed(1);
    console.log(
      `[${service}] ${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`,
    );
  };
}
