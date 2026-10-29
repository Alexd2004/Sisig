import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("import_map.json declares an imports object", async () => {
  const text = await Deno.readTextFile(
    new URL("./import_map.json", import.meta.url),
  );
  const map = JSON.parse(text);
  assertEquals(typeof map.imports, "object");
});
