import { handler } from "./handler.ts";

// Entry point for `supabase functions serve`. Logic lives in handler.ts so the
// Deno tests can import it without starting a server.
Deno.serve((req) => handler(req));
