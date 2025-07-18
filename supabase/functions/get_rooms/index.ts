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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Aktif lobileri çek (waiting veya started)
  const { data: lobbies, error } = await supabase
    .from("lobbies")
    .select("id, owner_id, status")
    .in("status", ["waiting", "started"])
    .order("status", { ascending: true })
    .order("id", { ascending: false })
    .limit(20)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }

  // Her lobi için oyuncu sayısı ve owner'ın ismini çek, oyuncusu olmayan lobileri sil
  const rooms = []
  for (const lobby of lobbies) {
    // Oyuncu sayısı
    const { count } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("lobby_id", lobby.id)
    if (!count || count < 1) {
      // Oyuncusu yoksa odayı sil
      await supabase.from("lobbies").delete().eq("id", lobby.id)
      continue;
    }
    // Oda sahibi ismi
    const { data: ownerPlayer } = await supabase
      .from("players")
      .select("name")
      .eq("lobby_id", lobby.id)
      .eq("is_owner", true)
      .single()
    let owner_icon = ownerPlayer?.name?.[0] || "👑";
    let owner_name = ownerPlayer?.name || "";
    rooms.push({
      id: lobby.id,
      status: lobby.status,
      player_count: count || 1,
      owner_icon,
      owner_name
    })
  }

  return new Response(
    JSON.stringify({ rooms }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get_rooms' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
