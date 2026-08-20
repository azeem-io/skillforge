import "server-only";

import { cookies } from "next/headers";

/**
 * The only place the frontend knows a backend exists. Every page and action
 * calls through here, and the URL it builds is always the gateway's — no
 * component ever names a service.
 *
 * Server-side fetches cannot use a relative URL, so they address the gateway
 * directly and forward the session cookie by hand. Client-side calls in
 * `lib/api-client.ts` use relative `/api/*` paths instead, which Caddy (or the
 * rewrite in next.config.ts) routes to the same place.
 */
const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = {
  method?: string;
  body?: unknown;
  /** Opt in to caching per call. Anything student-specific must stay uncached. */
  revalidate?: number;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const store = await cookies();
  const cookie = store
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");

  const response = await fetch(`${GATEWAY}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: options.revalidate === undefined ? "no-store" : undefined,
    next: options.revalidate === undefined ? undefined : { revalidate: options.revalidate },
  });

  if (!response.ok) {
    // The services all answer with `{ error }`; a proxy failure in between may
    // not, so the status is the fallback rather than an unparsed body.
    const message = await response
      .json()
      .then((data: { error?: string }) => data.error)
      .catch(() => null);
    throw new ApiError(response.status, message ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

/** Null instead of a throw for the "not signed in" case, which is not an error. */
export async function apiOrNull<T>(path: string, options: Options = {}): Promise<T | null> {
  try {
    return await api<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}
