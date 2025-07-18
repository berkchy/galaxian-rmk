// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // CORS preflight (OPTIONS) isteği ise:
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }
  // İstekten lobby_id al
  const { lobby_id } = await req.json()
  if (!lobby_id) {
    return new Response(JSON.stringify({ error: "lobby_id gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Oyuncuları çek
  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, is_owner, x, y, is_alive")
    .eq("lobby_id", lobby_id)

  // Lobi status'unu çek
  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("status")
    .eq("id", lobby_id)
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
  if (lobbyError) {
    return new Response(JSON.stringify({ error: lobbyError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }

  return new Response(
    JSON.stringify({ players, status: lobby.status }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get_players' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
