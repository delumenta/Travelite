import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type' },
});
const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|#39|nbsp);/g, ' ').replace(/\s+/g, ' ').trim();
const userAgent = 'Travelite/1.0 (https://delumenta.github.io/Travelite/; https://github.com/delumenta/Travelite)';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const country = String((await req.json()).country || '').trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{M}\p{N} .,'’()\-]{2,100}$/u.test(country)) return json({ error: 'Enter a valid country.' }, 400);
    const key = country.toLocaleLowerCase('en').trim();
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Sign in first.' }, 401);
    const viewer = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: auth, error: authError } = await viewer.auth.getUser(jwt);
    if (authError || !auth.user) return json({ error: 'Sign in first.' }, 401);
    const { data: trip, error: tripError } = await viewer.from('trips').select('id').eq('country', country).limit(1);
    if (tripError || !trip?.length) return json({ error: 'Add this destination to your trips first.' }, 403);
    const admin = createClient(url, service);
    const { data: cached } = await admin.from('country_photos').select('*').eq('country_key', key).maybeSingle();
    if (cached) return json({ photo: cached });

    const api = new URL('https://commons.wikimedia.org/w/api.php');
    Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: `${country} landscape travel -flag -map -logo`, gsrnamespace: '6', gsrlimit: '25', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1400' }).forEach(([k,v]) => api.searchParams.set(k,v));
    const search = await fetch(api, { headers: { 'user-agent': userAgent, accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!search.ok) throw Error('Photo search is unavailable.');
    const results = await search.json();
    const candidates = Object.values(results.query?.pages || {}) as Array<Record<string, any>>;
    candidates.sort((a,b) => (a.index || 999) - (b.index || 999));
    for (const page of candidates) {
      const info = page.imageinfo?.[0], meta = info?.extmetadata || {};
      const license = plain(meta.LicenseShortName?.value || '');
      const licenseUrl = meta.LicenseUrl?.value || null;
      const artist = plain(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons');
      const photoUrl = info?.thumburl;
      if (!photoUrl || !/^https:\/\/upload\.wikimedia\.org\//.test(photoUrl)) continue;
      if (!['image/jpeg','image/png','image/webp'].includes(info.mime) || info.width < 1000 || info.height < 500 || info.width / info.height < 1.35) continue;
      if (!/^(CC0|Public domain|CC BY(?:-SA)?(?: [234]\.0)?)$/i.test(license)) continue;
      if (/flag|coat.of.arms|map|diagram|logo|collage|poster/i.test(page.title || '')) continue;
      const response = await fetch(photoUrl, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10000) });
      if (!response.ok || Number(response.headers.get('content-length') || 0) > 5_000_000) continue;
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 5_000_000 || bytes.byteLength < 20_000) continue;
      const ext = info.mime === 'image/png' ? 'png' : info.mime === 'image/webp' ? 'webp' : 'jpg';
      const path = `${encodeURIComponent(key)}/cover.${ext}`;
      const uploaded = await admin.storage.from('country-photos').upload(path, bytes, { contentType: info.mime, upsert: false });
      if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw uploaded.error;
      const imageUrl = admin.storage.from('country-photos').getPublicUrl(path).data.publicUrl;
      const { data: saved, error } = await admin.from('country_photos').upsert({ country_key: key, country_name: country, image_url: imageUrl, source_page: info.descriptionurl, author: artist.slice(0,250), license, license_url: licenseUrl }, { onConflict: 'country_key', ignoreDuplicates: true }).select().maybeSingle();
      if (error) throw error;
      if (saved) return json({ photo: saved });
      const { data: concurrent } = await admin.from('country_photos').select('*').eq('country_key', key).single();
      return json({ photo: concurrent });
    }
    return json({ photo: null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Could not find a country photo.' }, 502);
  }
});
