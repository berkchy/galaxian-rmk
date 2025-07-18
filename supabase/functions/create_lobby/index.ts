// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Supabase client'ı import et
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
  // İstekten owner_id ve opsiyonel name al
  const { owner_id, name } = await req.json()
  if (!owner_id) {
    return new Response(JSON.stringify({ error: "owner_id gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Ortam değişkenlerinden Supabase URL ve ANON KEY al
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Lobi oluştur
  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .insert({ owner_id, status: "waiting" })
    .select()
    .single()

  if (lobbyError) {
    return new Response(JSON.stringify({ error: lobbyError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. Lobi sahibi oyuncu ekle
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      lobby_id: lobby.id,
      name: name || "Bilinmeyen",
      is_owner: true,
      x: 0,
      y: 0,
      is_alive: true,
    })
    .select()
    .single()

  if (playerError) {
    return new Response(JSON.stringify({ error: playerError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 3. Sonuç döndür
  return new Response(
    JSON.stringify({ lobby, player }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create_lobby' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
