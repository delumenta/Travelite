import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = { 'content-type':'application/json', 'access-control-allow-origin':'*', 'access-control-allow-headers':'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods':'POST, OPTIONS' };
const json = (value: unknown, status=200) => new Response(JSON.stringify(value), {status,headers});
const ua = 'Travelite/1.0 (https://delumenta.github.io/Travelite/; contact via GitHub)';
const plain = (html:string) => html.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const normal = (value:unknown) => String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const banned = /\b(logo|flag|map|diagram|poster|collage|advert|painting|drawing|illustration|woodcut|woodblock|print|artwork|aerial)\b/i;
const allowed = /^(CC0(?: 1\.0)?|Public domain|CC BY(?:-SA)?(?: [234]\.0)?)$/i;

async function api(url:string) {
  const response = await fetch(url,{headers:{'user-agent':ua,accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw Error(`Wikimedia returned ${response.status}`);
  return response.json();
}
function exactEntity(entity:any, place:any) {
  const target=normal(place.name);
  const values=[entity?.labels?.en?.value,...(entity?.aliases?.en||[]).map((x:any)=>x.value)].map(normal).filter(Boolean);
  if(!values.includes(target)) return false;
  const description=String(entity?.descriptions?.en?.value||'').toLowerCase();
  const city=String(place.city||'').toLowerCase();
  if(city.length>=4 && description && !description.includes(city) && /museum|district|temple|castle|shrine|park|mall|store|bridge|garden|island|tower|station/i.test(description)) return false;
  return true;
}
async function commonsFile(fileName:string) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action:'query',format:'json',titles:`File:${fileName}`,prop:'imageinfo|categories',iiprop:'url|size|mime|extmetadata',iiurlwidth:'700',cllimit:'200'}).forEach(([key,value])=>url.searchParams.set(key,value));
  const data=await api(url.toString());
  return Object.values(data.query?.pages||{})[0] as any;
}
async function processPlace(admin:any, place:any) {
  const search = new URL('https://www.wikidata.org/w/api.php');
  Object.entries({action:'wbsearchentities',format:'json',language:'en',limit:'10',search:place.name}).forEach(([key,value])=>search.searchParams.set(key,value));
  const searchData=await api(search.toString());
  const ids=(searchData.search||[]).map((item:any)=>item.id).filter(Boolean);
  if(!ids.length) return {status:'missing',reason:'No exact Wikidata place found.'};
  const entitiesUrl = new URL('https://www.wikidata.org/w/api.php');
  Object.entries({action:'wbgetentities',format:'json',ids:ids.join('|'),props:'labels|aliases|descriptions|claims',languages:'en'}).forEach(([key,value])=>entitiesUrl.searchParams.set(key,value));
  const entities=(await api(entitiesUrl.toString())).entities||{};
  const entity=Object.values(entities).find((item:any)=>exactEntity(item,place)) as any;
  const fileName=entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if(!entity) return {status:'missing',reason:'No verified exact Wikidata place match.'};
  if(!fileName) return {status:'missing',reason:'Exact Wikidata place has no Commons image.'};
  const file=await commonsFile(fileName);
  const info=file?.imageinfo?.[0], meta=info?.extmetadata||{};
  const text=[file?.title,meta.ImageDescription?.value,...(file?.categories||[]).map((x:any)=>x.title)].map(x=>plain(String(x||''))).join(' ');
  const license=plain(meta.LicenseShortName?.value||'');
  const candidateMeta={
    image_candidate_url:info?.thumburl||null,
    image_candidate_source_url:info?.descriptionurl||null,
    image_candidate_author:plain(meta.Artist?.value||meta.Credit?.value||'Wikimedia Commons').slice(0,250),
    image_candidate_license:license||null,
    image_candidate_license_url:meta.LicenseUrl?.value||null,
    image_match_method:'wikidata_p18_exact',
  };
  if(banned.test(text) && allowed.test(license) && candidateMeta.image_candidate_url && /^https:\/\/upload\.wikimedia\.org\//.test(candidateMeta.image_candidate_url) && ['image/jpeg','image/png','image/webp'].includes(info.mime)) return {status:'review',reason:'Exact place match, but the image may be artwork or a non-photo.',update:candidateMeta};
  if(banned.test(text)) return {status:'missing',reason:'Exact image is artwork, map, logo, or non-photo.'};
  if(!allowed.test(license)) return {status:'missing',reason:'Image licence is not approved for storage.'};
  if(!info?.thumburl || !/^https:\/\/upload\.wikimedia\.org\//.test(info.thumburl) || !['image/jpeg','image/png','image/webp'].includes(info.mime)) return {status:'missing',reason:'Exact image is not a usable photo file.'};
  if(info.width<500 || info.height<280) return {status:'missing',reason:'Exact image is too small.'};
  const image=await fetch(info.thumburl,{headers:{'user-agent':ua},signal:AbortSignal.timeout(12000)});
  if(!image.ok) throw Error('Could not download approved Commons image.');
  const bytes=await image.arrayBuffer();
  if(bytes.byteLength<15000 || bytes.byteLength>5000000) return {status:'missing',reason:'Exact image is outside the allowed size.'};
  const ext=info.mime==='image/png'?'png':info.mime==='image/webp'?'webp':'jpg';
  const path=`places/${place.id}.${ext}`;
  const uploaded=await admin.storage.from('place-photos').upload(path,bytes,{contentType:info.mime,upsert:true});
  if(uploaded.error) throw uploaded.error;
  return {status:'stored',update:{
    image_url:admin.storage.from('place-photos').getPublicUrl(path).data.publicUrl,
    image_source_url:info.descriptionurl,
    image_author:plain(meta.Artist?.value||meta.Credit?.value||'Wikimedia Commons').slice(0,250),
    image_license:license,
    image_license_url:meta.LicenseUrl?.value||null,
    image_match_method:'wikidata_p18_exact',
    image_review_reason:null,
  }};
}
async function saveResult(admin:any, place:any) {
  try {
    const result=await processPlace(admin,place);
    const update:any={image_status:result.status,image_checked_at:new Date().toISOString()};
    if(result.update) Object.assign(update,result.update);
    update.image_review_reason=result.reason||null;
    const {data,error}=await admin.from('places').update(update).eq('id',place.id).select('id,name,image_url,image_source_url,image_author,image_license,image_license_url,image_candidate_url,image_candidate_source_url,image_candidate_author,image_candidate_license,image_candidate_license_url,image_status,image_review_reason').single();
    if(error) throw error;
    return data;
  } catch(error) {
    const reason=error instanceof Error?error.message:'Photo check failed.';
    await admin.from('places').update({image_status:'failed',image_review_reason:reason,image_checked_at:new Date().toISOString()}).eq('id',place.id);
    return null;
  }
}
Deno.serve(async (req:Request) => {
  if(req.method==='OPTIONS') return json({ok:true});
  if(req.method!=='POST') return json({error:'Method not allowed.'},405);
  try {
    const jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(!jwt) return json({error:'Sign in first.'},401);
    const url=Deno.env.get('SUPABASE_URL')!;
    const viewer=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!);
    const {data:auth,error:authError}=await viewer.auth.getUser(jwt);
    if(authError||!auth.user) return json({error:'Sign in first.'},401);
    const body=await req.json().catch(()=>({}));
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if(body.mode==='next') {
      const limit=Math.max(1,Math.min(Number(body.limit)||3,5));
      const {data:places,error}=await admin.from('places').select('id,name,city,country').eq('status','active').eq('image_status','pending').order('id').limit(limit);
      if(error) throw error;
      const photos=[]; for(const place of places||[]) photos.push(await saveResult(admin,place));
      const {count}=await admin.from('places').select('id',{count:'exact',head:true}).eq('status','active').eq('image_status','pending');
      return json({photos:photos.filter(Boolean),pending:count||0});
    }
    const id=Number(body.place_id);
    if(!Number.isSafeInteger(id)||id<1) return json({error:'Invalid place.'},400);
    const {data:place,error}=await admin.from('places').select('id,name,city,country,image_status,image_url,image_source_url,image_author,image_license,image_license_url,image_review_reason').eq('id',id).eq('status','active').single();
    if(error||!place) return json({error:'Place not found.'},404);
    if(place.image_status!=='pending') return json({photo:place});
    return json({photo:await saveResult(admin,place)});
  } catch(error) {
    console.error('Place photo error',error);
    return json({error:'Place photo is unavailable right now.'},502);
  }
});