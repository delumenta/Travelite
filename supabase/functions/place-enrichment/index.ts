import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const addressPart = (parts: any[], types: string[]) =>
  parts?.find((part: any) => types.some((type) => part.types?.includes(type)))?.longText ?? null;
const mapUrl = (placeId: string) => `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Sign in first.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const viewer = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: auth, error: authError } = await viewer.auth.getUser(jwt);
    if (authError || !auth.user) return json({ error: 'Sign in first.' }, 401);

    const apiKey = Deno.env.get('GOOGLE_PLACES_SERVER_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return json({ error: 'Google Places is not configured.' }, 503);

    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body.limit) || 5, 10));
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: rows, error: queueError } = await admin
      .from('places')
      .select('id,name,city,country,google_enrichment_attempts')
      .eq('status', 'active')
      .eq('google_enrichment_status', 'pending')
      .lt('google_enrichment_attempts', 3)
      .order('id')
      .limit(limit);
    if (queueError) throw queueError;

    const summary = { attempted: 0, updated: 0, failed: 0, pending: 0, errors: [] as string[] };

    for (const row of rows || []) {
      summary.attempted++;
      const attempt = (row.google_enrichment_attempts || 0) + 1;
      try {
        // This is Google's no-cost Text Search Essentials (IDs Only) SKU.
        const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
            'x-goog-fieldmask': 'places.id',
          },
          body: JSON.stringify({
            textQuery: [row.name, row.city, row.country].filter(Boolean).join(', '),
            pageSize: 1,
            languageCode: 'en',
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (!search.ok) throw new Error(`Google search returned ${search.status}`);
        const candidate = (await search.json()).places?.[0];
        if (!candidate?.id) throw new Error('No Google place found');

        // Essentials fields only: coordinates, address and address components.
        const details = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(candidate.id)}`, {
          headers: {
            'x-goog-api-key': apiKey,
            'x-goog-fieldmask': 'id,formattedAddress,addressComponents,location,types',
          },
          signal: AbortSignal.timeout(12000),
        });
        if (!details.ok) throw new Error(`Google details returned ${details.status}`);
        const place = await details.json();
        if (!place?.id || !Number.isFinite(place.location?.latitude) || !Number.isFinite(place.location?.longitude)) {
          throw new Error('Google result had no usable coordinates');
        }

        const parts = place.addressComponents || [];
        const update = {
          provider: 'google',
          provider_place_id: place.id,
          country: addressPart(parts, ['country']) || row.country,
          prefecture: addressPart(parts, ['administrative_area_level_1']),
          city: addressPart(parts, ['locality', 'postal_town', 'administrative_area_level_2']) || row.city,
          area: addressPart(parts, ['sublocality_level_1', 'sublocality', 'neighborhood']),
          postal_code: addressPart(parts, ['postal_code']),
          address: place.formattedAddress || null,
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          maps_url: mapUrl(place.id),
          google_enrichment_status: 'done',
          google_enrichment_attempts: attempt,
          google_enriched_at: new Date().toISOString(),
        };
        const { error: updateError } = await admin.from('places').update(update).eq('id', row.id);
        if (updateError) throw updateError;
        summary.updated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const status = attempt >= 3 ? 'failed' : 'pending';
        const { error: updateError } = await admin.from('places')
          .update({ google_enrichment_attempts: attempt, google_enrichment_status: status })
          .eq('id', row.id);
        if (updateError) throw updateError;
        summary.failed++;
        summary.errors.push(`${row.id}: ${message}`);
      }
    }

    const { count } = await admin.from('places')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('google_enrichment_status', 'pending')
      .lt('google_enrichment_attempts', 3);
    summary.pending = count || 0;
    return json(summary);
  } catch (error) {
    console.error('Place enrichment error', error);
    return json({ error: 'Catalog enrichment is unavailable right now.' }, 502);
  }
});