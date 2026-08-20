import { IDENTITY_HEADERS, type Identity, type UserRole } from "@skillforge/service-kit";

type SessionResponse = { user: Identity | null };

/**
 * Turns the request's cookie into an identity by asking auth-service. This is
 * the only place in the system that verifies a session; every service
 * downstream reads the three headers the proxy adds from the result.
 *
 * A request with no cookie never makes the call — the taxonomy reads are
 * public, and an unauthenticated page load should not cost a round trip.
 */
export async function resolveIdentity(
  request: Request,
  authServiceUrl: string,
  gatewaySecret: string,
): Promise<Identity | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  let response: Response;
  try {
    response = await fetch(new URL("/internal/session", authServiceUrl), {
      headers: {
        cookie,
        [IDENTITY_HEADERS.key]: gatewaySecret,
      },
    });
  } catch {
    // auth-service being down must not turn every public read into a 500. The
    // request continues without an identity, and anything that needs one 401s.
    console.error("[api-gateway] auth-service unreachable");
    return null;
  }

  if (!response.ok) return null;

  const body = (await response.json()) as SessionResponse;
  if (!body.user) return null;

  const { id, email, role } = body.user;
  return id && email && role ? { id, email, role: role as UserRole } : null;
}
