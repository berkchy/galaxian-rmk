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

  const { player_id } = await req.json();
  if (!player_id) {
    return new Response(JSON.stringify({ error: "player_id gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Oyuncunun lobisini bul
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("lobby_id, is_owner")
    .eq("id", player_id)
    .single()
  if (playerError || !player) {
    return new Response(JSON.stringify({ error: "Oyuncu bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  const lobby_id = player.lobby_id;
  const was_owner = player.is_owner;

  // Oyuncuyu sil
  await supabase.from("players").delete().eq("id", player_id);

  // Kalan oyuncuları çek
  const { data: remainingPlayers, count } = await supabase
    .from("players")
    .select("id", { count: "exact" })
    .eq("lobby_id", lobby_id)
    .order("id", { ascending: true });

  if (!count || count < 1) {
    // Odayı sil
    await supabase.from("lobbies").delete().eq("id", lobby_id);
  } else if (was_owner) {
    // Owner çıktıysa, kalanlardan rastgele birini yeni owner yap
    const randomIdx = Math.floor(Math.random() * remainingPlayers.length);
    const newOwnerId = remainingPlayers[randomIdx]?.id;
    if (newOwnerId) {
      const ownerRes = await supabase.from("players").update({ is_owner: true }).eq("id", newOwnerId);
      const lobbyRes = await supabase.from("lobbies").update({ owner_id: newOwnerId }).eq("id", lobby_id);
      if (ownerRes.error) console.log('Yeni owner atanamadı:', ownerRes.error);
      if (lobbyRes.error) console.log('Lobi owner_id güncellenemedi:', lobbyRes.error);
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/leave_lobby' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
