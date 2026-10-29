import {
  authConfigFromEnv,
  authenticate,
  type AuthUser,
} from "../_shared/auth.ts";
import { jsonResponse, preflightResponse } from "../_shared/cors.ts";
import { AppError, errorEnvelope } from "../_shared/errors.ts";

export interface WhoamiDeps {
  authenticate: (req: Request) => Promise<AuthUser>;
}

const defaultDeps: WhoamiDeps = {
  authenticate: (req) => authenticate(req, authConfigFromEnv()),
};

/** GET /whoami: returns the signed-in caller's id, email and app role. */
export async function handler(
  req: Request,
  deps: WhoamiDeps = defaultDeps,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflightResponse();
  }
  try {
    if (req.method !== "GET") {
      throw new AppError(405, "method_not_allowed", "Use GET");
    }
    const user = await deps.authenticate(req);
    return jsonResponse({
      user: { id: user.id, email: user.email, appRole: user.appRole },
    });
  } catch (error) {
    return errorEnvelope(error);
  }
}
