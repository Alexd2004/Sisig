import { AppError } from "./errors.ts";

export const APP_ROLES = ["customer", "staff", "admin", "owner"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string | null;
  /** From the `app_role` JWT claim (added by the access-token hook). */
  appRole: AppRole | null;
}

export interface AuthConfig {
  supabaseUrl: string;
  /** Public anon key, sent only as the `apikey` header to Supabase Auth. */
  apiKey: string;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
}

/** Reads the URL and anon key that Supabase injects into every function. */
export function authConfigFromEnv(): AuthConfig {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const apiKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !apiKey) {
    throw new AppError(500, "internal_error", "Server misconfigured");
  }
  return { supabaseUrl, apiKey };
}

/** Returns the token from `Authorization: Bearer <token>`, or throws 401. */
export function getBearerToken(req: Request): string {
  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) {
    throw new AppError(401, "unauthorized", "Missing bearer token");
  }
  return match[1];
}

/**
 * Reads the payload of a JWT WITHOUT checking its signature. Only call this on
 * a token that authenticate() has already verified with Supabase Auth.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AppError(401, "unauthorized", "Malformed token");
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload: unknown = JSON.parse(atob(padded));
    if (
      typeof payload !== "object" || payload === null || Array.isArray(payload)
    ) {
      throw new Error("payload is not a JSON object");
    }
    return payload as Record<string, unknown>;
  } catch {
    throw new AppError(401, "unauthorized", "Malformed token");
  }
}

/**
 * Verifies the caller's access token with Supabase Auth (GET /auth/v1/user),
 * which rejects expired, revoked or forged tokens, and returns the user.
 */
export async function authenticate(
  req: Request,
  config: AuthConfig,
): Promise<AuthUser> {
  const token = getBearerToken(req);
  const fetchFn = config.fetchFn ?? ((url, init) => fetch(url, init));
  const res = await fetchFn(`${config.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: config.apiKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new AppError(401, "unauthorized", "Invalid or expired session");
  }
  const body = (await res.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (typeof body?.id !== "string") {
    throw new AppError(401, "unauthorized", "Invalid or expired session");
  }
  const claims = decodeJwtPayload(token);
  const appRole = APP_ROLES.find((role) => role === claims.app_role) ?? null;
  return {
    id: body.id,
    email: typeof body.email === "string" ? body.email : null,
    appRole,
  };
}

/**
 * Throws 403 unless the user's role is in `allowed`.
 * The role comes from the JWT, so it can be stale for up to one token lifetime.
 * Sensitive writes must re-check public.user_roles inside SQL as well.
 */
export function requireRole(user: AuthUser, allowed: readonly AppRole[]): void {
  if (user.appRole === null || !allowed.includes(user.appRole)) {
    throw new AppError(403, "forbidden", "Insufficient permissions");
  }
}
