import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { authenticate } from "../_shared/auth.ts";
import { handler, type WhoamiDeps } from "./handler.ts";

function b64url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function jwtWith(claims: Record<string, unknown>): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(claims)}.sig`;
}

/** Real authenticate() wired to a fake Supabase Auth that answers with status/body. */
function depsWithAuth(status: number, body: unknown): WhoamiDeps {
  return {
    authenticate: (req) =>
      authenticate(req, {
        supabaseUrl: "https://project.example.test",
        apiKey: "anon-key",
        fetchFn: () =>
          Promise.resolve(
            new Response(JSON.stringify(body), {
              status,
              headers: { "content-type": "application/json" },
            }),
          ),
      }),
  };
}

Deno.test("OPTIONS returns 204 with CORS headers", async () => {
  const res = await handler(
    new Request("http://localhost/whoami", { method: "OPTIONS" }),
    depsWithAuth(200, {}),
  );
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});

Deno.test("non-GET methods return 405 in the error envelope", async () => {
  const res = await handler(
    new Request("http://localhost/whoami", { method: "POST" }),
    depsWithAuth(200, {}),
  );
  assertEquals(res.status, 405);
  assertEquals(await res.json(), {
    error: { code: "method_not_allowed", message: "Use GET" },
  });
});

Deno.test("missing token returns 401 in the error envelope", async () => {
  const res = await handler(
    new Request("http://localhost/whoami"),
    depsWithAuth(200, { id: "u-0" }),
  );
  assertEquals(res.status, 401);
  assertEquals(await res.json(), {
    error: { code: "unauthorized", message: "Missing bearer token" },
  });
});

Deno.test("valid token returns the caller's id, email and app role", async () => {
  const token = jwtWith({ sub: "u-1", app_role: "owner" });
  const res = await handler(
    new Request("http://localhost/whoami", {
      headers: { authorization: `Bearer ${token}` },
    }),
    depsWithAuth(200, { id: "u-1", email: "owner@example.com" }),
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    user: { id: "u-1", email: "owner@example.com", appRole: "owner" },
  });
});

Deno.test("token rejected by Supabase Auth returns 401", async () => {
  const res = await handler(
    new Request("http://localhost/whoami", {
      headers: { authorization: `Bearer ${jwtWith({})}` },
    }),
    depsWithAuth(401, { msg: "invalid JWT" }),
  );
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error.code, "unauthorized");
});
