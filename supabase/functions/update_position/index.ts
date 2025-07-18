// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
  // İstekten player_id, x, y al
  const { player_id, x, y } = await req.json()
  if (!player_id || typeof x !== "number" || typeof y !== "number") {
    return new Response(JSON.stringify({ error: "player_id, x ve y gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Pozisyonu güncelle
  const { data: player, error } = await supabase
    .from("players")
    .update({ x, y })
    .eq("id", player_id)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({ player }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  )
})
