import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const ua = 'Travelite/1.0 (https://delumenta.github.io/Travelite/; https://github.com/delumenta/Travelite)';
const allowed = /^(CC0(?: 1\.0)?|Public domain|CC BY(?:-SA)?(?: [234]\.0)?)$/i;
const words = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !['park','museum','temple','bridge','garden','gardens','national','palace','beach','island','church','tower','mall','city','forest','lake','rome','london','seoul','tokyo','singapore','beijing','taipei','bangkok','jakarta','italy'].includes(w));

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
    const id = Number((await req.json()).place_id);
    if (!Number.isSafeInteger(id) || id < 1) return json({ error: 'Invalid place.' }, 400);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: place, error: placeError } = await admin.from('places').select('id,name,city,country,status,image_url,image_author,image_license,image_license_url,image_source_url').eq('id', id).single();
    if (placeError || !place || place.status !== 'active') return json({ error: 'Place not found.' }, 404);
    if (place.image_url) return json({ photo: place });
    const query = [place.name,place.city,place.country].filter(Boolean).join(' ').slice(0,160);
    const api = new URL('https://commons.wikimedia.org/w/api.php');
    Object.entries({ action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'20',prop:'imageinfo',iiprop:'url|size|mime|extmetadata',iiurlwidth:'600' }).forEach(([key,value])=>api.searchParams.set(key,value));
    const response = await fetch(api,{headers:{'user-agent':ua,accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if (!response.ok) return json({ photo:null });
    const results = await response.json();
    const candidates = (Object.values(results.query?.pages || {}) as Array<Record<string,any>>).sort((a,b)=>(a.index||999)-(b.index||999));
    const keyWords = words(place.name);
    if (!keyWords.length) return json({ photo:null });
    for (const page of candidates) {
      const info=page.imageinfo?.[0], meta=info?.extmetadata||{}, title=String(page.title||'').toLowerCase();
      const overlap=keyWords.filter(w=>title.includes(w)).length;
      if (overlap < Math.min(2,keyWords.length) || /logo|flag|map|diagram|poster|collage|advert/i.test(title)) continue;
      const license=plain(meta.LicenseShortName?.value||'');
      const photoUrl=info?.thumburl;
      if (!allowed.test(license)||!photoUrl||!/^https:\/\/upload\.wikimedia\.org\//.test(photoUrl)) continue;
      if (!['image/jpeg','image/png','image/webp'].includes(info.mime) || info.width < 600 || info.height < 300) continue;
      const file=await fetch(photoUrl,{headers:{'user-agent':ua},signal:AbortSignal.timeout(12000)});
      if (!file.ok || Number(file.headers.get('content-length')||0)>5000000) continue;
      const bytes=await file.arrayBuffer();
      if (bytes.byteLength<15000||bytes.byteLength>5000000) continue;
      const ext=info.mime==='image/png'?'png':info.mime==='image/webp'?'webp':'jpg';
      const path=`places/${id}.${ext}`;
      const uploaded=await admin.storage.from('place-photos').upload(path,bytes,{contentType:info.mime,upsert:false});
      if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw uploaded.error;
      const image_url=admin.storage.from('place-photos').getPublicUrl(path).data.publicUrl;
      const image_author=plain(meta.Artist?.value||meta.Credit?.value||'Wikimedia Commons').slice(0,250);
      const update={image_url,image_source_url:info.descriptionurl,image_author,image_license:license,image_license_url:meta.LicenseUrl?.value||null};
      const {data:saved,error}=await admin.from('places').update(update).eq('id',id).is('image_url',null).select('id,image_url,image_source_url,image_author,image_license,image_license_url').maybeSingle();
      if(error) throw error;
      return json({photo:saved||{...place,...update}});
    }
    return json({photo:null});
  } catch (error) {
    console.error('Place photo error',error);
    return json({error:'Place photo is unavailable right now.'},502);
  }
});
