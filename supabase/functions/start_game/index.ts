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
  // İstekten lobby_id ve owner_id al
  const { lobby_id, owner_id } = await req.json()
  if (!lobby_id || !owner_id) {
    return new Response(JSON.stringify({ error: "lobby_id ve owner_id gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Lobi sahibi mi kontrol et
  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, owner_id, status")
    .eq("id", lobby_id)
    .single()

  if (lobbyError || !lobby) {
    return new Response(JSON.stringify({ error: "Lobi bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (lobby.owner_id !== owner_id) {
    return new Response(JSON.stringify({ error: "Sadece lobi sahibi başlatabilir" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. Lobi status'unu 'started' yap
  const { data: updatedLobby, error: updateError } = await supabase
    .from("lobbies")
    .update({ status: "started" })
    .eq("id", lobby_id)
    .select()
    .single()

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({ lobby: updatedLobby }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/start_game' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
