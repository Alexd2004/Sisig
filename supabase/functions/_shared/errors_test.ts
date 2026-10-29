import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { AppError, errorEnvelope } from "./errors.ts";

Deno.test("AppError keeps its status, code and message in the envelope", async () => {
  const res = errorEnvelope(new AppError(403, "forbidden", "Nope"));
  assertEquals(res.status, 403);
  assertEquals(res.headers.get("content-type"), "application/json");
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
  assertEquals(await res.json(), {
    error: { code: "forbidden", message: "Nope" },
  });
});

Deno.test("unexpected errors become a generic 500 without leaking details", async () => {
  const originalError = console.error;
  console.error = () => {}; // keep test output clean; the error is logged in prod
  try {
    const res = errorEnvelope(new Error("relation secrets does not exist"));
    assertEquals(res.status, 500);
    assertEquals(await res.json(), {
      error: { code: "internal_error", message: "Unexpected server error" },
    });
  } finally {
    console.error = originalError;
  }
});
