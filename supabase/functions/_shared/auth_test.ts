import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  type AppRole,
  authenticate,
  type AuthUser,
  decodeJwtPayload,
  getBearerToken,
  requireRole,
} from "./auth.ts";
import { AppError } from "./errors.ts";

function b64url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** A JWT-shaped string. The signature is fake: these helpers never verify it. */
function fakeJwt(claims: Record<string, unknown>): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(claims)}.sig`;
}

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/whoami", { headers });
}

Deno.test("getBearerToken reads the token from a Bearer header", () => {
  assertEquals(
    getBearerToken(req({ authorization: "Bearer abc.def.ghi" })),
    "abc.def.ghi",
  );
  assertEquals(getBearerToken(req({ authorization: "bearer abc" })), "abc");
});

Deno.test("getBearerToken rejects a missing or non-Bearer header with 401", () => {
  const badHeaders: Record<string, string>[] = [
    {},
    { authorization: "Basic dXNlcjpwYXNz" },
    { authorization: "Bearer" },
  ];
  for (const headers of badHeaders) {
    assertThrows(
      () => getBearerToken(req(headers)),
      AppError,
      "Missing bearer token",
    );
  }
});

Deno.test("decodeJwtPayload returns the claims of a well-formed token", () => {
  const claims = decodeJwtPayload(fakeJwt({ sub: "u-1", app_role: "staff" }));
  assertEquals(claims.sub, "u-1");
  assertEquals(claims.app_role, "staff");
});

Deno.test("decodeJwtPayload rejects malformed tokens with 401", () => {
  assertThrows(
    () => decodeJwtPayload("not-a-jwt"),
    AppError,
    "Malformed token",
  );
  assertThrows(
    () => decodeJwtPayload("a.%%%.c"),
    AppError,
    "Malformed token",
  );
  assertThrows(
    () => decodeJwtPayload(`a.${b64url([1, 2])}.c`),
    AppError,
    "Malformed token",
  );
});

Deno.test("authenticate verifies with Supabase Auth and attaches the app role", async () => {
  const token = fakeJwt({ sub: "u-1", app_role: "admin" });
  let seenUrl = "";
  let seenHeaders = new Headers();
  const user = await authenticate(
    req({ authorization: `Bearer ${token}` }),
    {
      supabaseUrl: "https://project.example.test",
      apiKey: "anon-key",
      fetchFn: (url, init) => {
        seenUrl = url;
        seenHeaders = new Headers(init.headers);
        return Promise.resolve(
          Response.json({ id: "u-1", email: "a@example.com" }),
        );
      },
    },
  );
  assertEquals(user, { id: "u-1", email: "a@example.com", appRole: "admin" });
  assertEquals(seenUrl, "https://project.example.test/auth/v1/user");
  assertEquals(seenHeaders.get("apikey"), "anon-key");
  assertEquals(seenHeaders.get("authorization"), `Bearer ${token}`);
});

Deno.test("authenticate leaves appRole null when the claim is missing or unknown", async () => {
  const fetchFn = () => Promise.resolve(Response.json({ id: "u-2" }));
  for (const claims of [{ sub: "u-2" }, { app_role: "superuser" }]) {
    const user = await authenticate(
      req({ authorization: `Bearer ${fakeJwt(claims)}` }),
      { supabaseUrl: "https://x.test", apiKey: "k", fetchFn },
    );
    assertEquals(user.appRole, null);
    assertEquals(user.email, null);
  }
});

Deno.test("authenticate rejects when Supabase Auth does not accept the token", async () => {
  const fetchFn = () =>
    Promise.resolve(Response.json({ msg: "invalid JWT" }, { status: 401 }));
  await assertRejects(
    () =>
      authenticate(
        req({ authorization: `Bearer ${fakeJwt({ sub: "u-3" })}` }),
        { supabaseUrl: "https://x.test", apiKey: "k", fetchFn },
      ),
    AppError,
    "Invalid or expired session",
  );
});

Deno.test("requireRole allows listed roles and rejects others with 403", () => {
  const staff: AuthUser = {
    id: "u-4",
    email: null,
    appRole: "staff" as AppRole,
  };
  requireRole(staff, ["staff", "admin", "owner"]);
  assertThrows(
    () => requireRole(staff, ["admin", "owner"]),
    AppError,
    "Insufficient permissions",
  );
  assertThrows(
    () => requireRole({ ...staff, appRole: null }, ["customer"]),
    AppError,
    "Insufficient permissions",
  );
});
