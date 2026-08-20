"use client";

/**
 * The browser half of lib/api.ts. Relative URLs on purpose: the request goes to
 * the page's own origin, which Caddy (in compose) or the rewrite in
 * next.config.ts (in dev) forwards to the gateway. Same origin means the
 * session cookie is sent without SameSite=None, which would need TLS and would
 * make a plain `docker compose up` unable to sign anyone in.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { error?: string; message?: string } | null)?.error ??
      (data as { message?: string } | null)?.message ??
      `Request failed (${response.status})`;
    return { ok: false, error: message };
  }

  return { ok: true, data: data as T };
}
