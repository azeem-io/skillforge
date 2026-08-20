import { IDENTITY_HEADERS, type Identity } from "@skillforge/service-kit";
import type { Context } from "hono";

/**
 * Headers that describe the transport of the *inbound* request and would be
 * wrong on the outbound one. `content-length` in particular: the body is
 * streamed, so the value no longer describes what is being sent.
 */
const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  "host",
  "content-length",
];

function clientIp(c: Context): string | null {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded;
  const server = c.env as { requestIP?: (r: Request) => { address: string } | null };
  return server?.requestIP?.(c.req.raw)?.address ?? null;
}

/**
 * Forwards the request to `target`, replacing whatever the caller claimed
 * about their identity with what the gateway actually verified.
 *
 * The delete loop is the security boundary: a client that sends its own
 * `x-skillforge-user-id` gets it stripped here, and cannot supply the gateway
 * key that would make a service believe one.
 */
export async function forward(
  c: Context,
  target: string,
  identity: Identity | null,
  gatewaySecret: string,
): Promise<Response> {
  const url = new URL(c.req.path, target);
  url.search = new URL(c.req.url).search;

  const headers = new Headers(c.req.raw.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);
  for (const name of Object.values(IDENTITY_HEADERS)) headers.delete(name);

  headers.set(IDENTITY_HEADERS.key, gatewaySecret);
  if (identity) {
    headers.set(IDENTITY_HEADERS.id, identity.id);
    headers.set(IDENTITY_HEADERS.email, identity.email);
    headers.set(IDENTITY_HEADERS.role, identity.role);
  }

  const ip = clientIp(c);
  if (ip) headers.set("x-forwarded-for", ip);
  headers.set("x-forwarded-host", c.req.header("host") ?? "");
  headers.set("x-forwarded-proto", new URL(c.req.url).protocol.replace(":", ""));

  const method = c.req.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body: hasBody ? c.req.raw.body : undefined,
      // Required by the fetch spec whenever a stream is used as a body.
      ...(hasBody ? { duplex: "half" } : {}),
      // A redirect belongs to the caller, not to the proxy — following it here
      // would resolve it against the internal service URL.
      redirect: "manual",
    } as RequestInit);
  } catch (error) {
    console.error(`[api-gateway] ${target} unreachable:`, error);
    return c.json({ error: "Upstream service unavailable" }, 502);
  }

  const out = new Headers();
  for (const [key, value] of upstream.headers) {
    // fetch has already decompressed the body; leaving the header on would
    // make the browser try to decompress it a second time.
    if (key === "content-encoding" || key === "content-length") continue;
    if (key === "set-cookie") continue;
    out.set(key, value);
  }
  // Multiple Set-Cookie headers do not survive the loop above — Headers
  // collapses them into one comma-joined value, which browsers reject.
  for (const cookie of upstream.headers.getSetCookie()) {
    out.append("set-cookie", cookie);
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
