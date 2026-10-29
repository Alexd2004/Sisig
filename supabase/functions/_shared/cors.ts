// CORS and JSON response helpers shared by every Edge Function.
// Every response carries these headers so browser clients (the admin web app)
// can read errors as well as successes. Tighten the origin before production.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** Answer for a CORS preflight (OPTIONS) request. */
export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** JSON success (or any non-error) response carrying CORS headers. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
