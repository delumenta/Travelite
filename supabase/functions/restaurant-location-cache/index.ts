import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const key = (value: unknown) => String(value ?? "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^\p{L}\p{N}]+/gu, "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anon);
    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });

    const body = await req.json().catch(() => ({}));
    const results = Array.isArray(body?.results) ? body.results.slice(0, 20) : [];
    if (!results.length) return Response.json({ updated: 0 }, { headers: cors });

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: restaurants, error: readError } = await admin
      .from("restaurants")
      .select("id,name,provider_place_id,latitude,longitude,status")
      .eq("status", "active");
    if (readError) throw readError;

    const byPlaceId = new Map<string, any>();
    const byName = new Map<string, any[]>();
    for (const r of restaurants || []) {
      if (r.provider_place_id) byPlaceId.set(String(r.provider_place_id), r);
      const k = key(r.name);
      if (k) byName.set(k, [...(byName.get(k) || []), r]);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);
    let updated = 0;

    for (const item of results) {
      const placeId = String(item?.provider_place_id || "");
      const lat = Number(item?.latitude);
      const lng = Number(item?.longitude);
      if (!placeId || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      let match = byPlaceId.get(placeId);
      if (!match) {
        const candidates = byName.get(key(item?.name)) || [];
        if (candidates.length === 1) match = candidates[0];
      }
      if (!match) continue;

      const { error } = await admin.from("restaurants").update({
        provider: "google",
        provider_place_id: placeId,
        latitude: lat,
        longitude: lng,
        google_location_obtained_at: now.toISOString(),
        google_location_expires_at: expires.toISOString(),
        google_location_last_used_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", match.id);
      if (!error) updated++;
    }

    return Response.json({ updated }, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("restaurant-location-cache", error);
    return Response.json({ error: error instanceof Error ? error.message : "Cache update failed" }, { status: 500, headers: cors });
  }
});