import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});
const fields = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.addressComponents', 'places.location', 'places.types',
  'places.primaryType', 'places.googleMapsUri',
].join(',');
const addressPart = (parts: any[], types: string[]) =>
  parts?.find((part: any) => types.some(type => part.types?.includes(type)))?.longText ?? null;

const POI_TYPES = [
  'tourist_attraction',
  'historical_landmark',
  'historical_place',
  'cultural_landmark',
  'museum',
  'art_gallery',
  'garden',
  'park',
  'botanical_garden',
  'observation_deck',
  'scenic_spot',
  'buddhist_temple',
  'shinto_shrine',
  'church',
  'hindu_temple',
  'mosque',
  'synagogue',
  'bridge',
  'plaza',
  'market',
  'shopping_mall',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /i, '');
  if (!token) return json({ error: 'Sign in to search places.' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: 'Sign in to search places.' }, 401);

  const body = await req.json().catch(() => ({}));
  const nearby = body.nearby === true;
  const nearbyMode = body.nearby_mode === 'poi' ? 'poi' : 'food';
  const query = String(body.query || '').trim().slice(0, 120);
  const kind = body.kind === 'food' ? 'food' : 'place';
  const destination = String(body.destination || '').trim().slice(0, 80);

  if (!nearby && query.length < 3) return json({ error: 'Enter at least three letters.' }, 400);

  const apiKey =
    Deno.env.get('GOOGLE_PLACES_SERVER_API_KEY') ||
    Deno.env.get('GOOGLE_PLACES_API_KEY') ||
    Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) return json({ error: 'Google Places is not configured.' }, 503);

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (
    nearby &&
    (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
  ) return json({ error: 'Valid location is required.' }, 400);

  const requestedRadius = Number(body.radius);
  const nearbyRadius = nearbyMode === 'poi'
    ? Math.min(3000, Math.max(300, Number.isFinite(requestedRadius) ? requestedRadius : 1500))
    : 300;

  const textQuery = destination && !query.toLowerCase().includes(destination.toLowerCase())
    ? `${query} ${destination}`
    : query;

  const nearbyRequest = nearbyMode === 'poi'
    ? {
        includedTypes: POI_TYPES,
        maxResultCount: 20,
        rankPreference: 'POPULARITY',
        languageCode: 'en',
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius: nearbyRadius },
        },
      }
    : {
        includedTypes: ['restaurant', 'cafe', 'bakery'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        languageCode: 'en',
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius: 300 },
        },
      };

  try {
    const response = await fetch(
      nearby
        ? 'https://places.googleapis.com/v1/places:searchNearby'
        : 'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fields,
        },
        body: JSON.stringify(nearby
          ? nearbyRequest
          : { textQuery, pageSize: 8, languageCode: 'en' }),
      },
    );

    if (!response.ok) {
      console.error('Google Places search failed', response.status, await response.text());
      return json({ error: 'Google search is unavailable right now. Try again shortly.' }, 502);
    }

    const data = await response.json();
    const results = (data.places || [])
      .filter((p: any) => p.id && p.displayName?.text)
      .map((p: any, index: number) => {
        const parts = p.addressComponents || [];
        const primaryType = p.primaryType || 'attraction';
        const resultKind = nearbyMode === 'poi'
          ? 'place'
          : ['restaurant','cafe','bakery','bar','food_court','meal_takeaway','meal_delivery'].includes(primaryType)
            ? 'food'
            : kind;

        return {
          name: p.displayName.text,
          provider: 'google',
          provider_place_id: p.id,
          country: addressPart(parts, ['country']),
          prefecture: addressPart(parts, ['administrative_area_level_1']),
          city: addressPart(parts, ['locality', 'administrative_area_level_2']),
          area: addressPart(parts, ['sublocality_level_1', 'sublocality', 'neighborhood']),
          postal_code: addressPart(parts, ['postal_code']),
          address: p.formattedAddress || null,
          latitude: p.location?.latitude ?? null,
          longitude: p.location?.longitude ?? null,
          maps_url: p.googleMapsUri ||
            `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(p.id)}`,
          place_type: primaryType,
          result_kind: resultKind,
          cuisine: resultKind === 'food' ? primaryType : null,
          nearby_rank: nearby ? index + 1 : null,
          nearby_mode: nearby ? nearbyMode : null,
        };
      });

    return json({ results, nearby_mode: nearby ? nearbyMode : null, radius: nearby ? nearbyRadius : null });
  } catch (error) {
    console.error('Google Places search error', error);
    return json({ error: 'Google search is unavailable right now. Try again shortly.' }, 502);
  }
});
