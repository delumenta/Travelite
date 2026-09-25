import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization, x-client-info, apikey, content-type','access-control-allow-methods':'POST, OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return json({ok:true});
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  try{
    const jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(!jwt)return json({error:'Sign in first.'},401);
    const url=Deno.env.get('SUPABASE_URL')!;
    const viewer=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!);
    const {data:auth,error:authError}=await viewer.auth.getUser(jwt);
    if(authError||!auth.user)return json({error:'Sign in first.'},401);
    const {place_id,action}=await req.json();
    const id=Number(place_id);
    if(!Number.isSafeInteger(id)||id<1||!['approve','reject','missing'].includes(action))return json({error:'Invalid review request.'},400);
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const {data:place,error}=await admin.from('places').select('id,image_status,image_candidate_url,image_candidate_source_url,image_candidate_author,image_candidate_license,image_candidate_license_url').eq('id',id).single();
    if(error||!place)return json({error:'Place not found.'},404);
    let update:any;
    if(action==='approve'){
      if(place.image_status!=='review'||!place.image_candidate_url)return json({error:'No review image to approve.'},409);
      const image=await fetch(place.image_candidate_url,{signal:AbortSignal.timeout(12000)});
      if(!image.ok)throw Error('Could not download the review image.');
      const mime=image.headers.get('content-type')?.split(';')[0]||'image/jpeg';
      if(!['image/jpeg','image/png','image/webp'].includes(mime))throw Error('The review image is not a supported format.');
      const bytes=await image.arrayBuffer();
      if(bytes.byteLength<15000||bytes.byteLength>5000000)throw Error('The review image is outside the allowed size.');
      const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
      const path=`places/${id}.${ext}`;
      const upload=await admin.storage.from('place-photos').upload(path,bytes,{contentType:mime,upsert:true});
      if(upload.error)throw upload.error;
      update={image_url:admin.storage.from('place-photos').getPublicUrl(path).data.publicUrl,image_source_url:place.image_candidate_source_url,image_author:place.image_candidate_author,image_license:place.image_candidate_license,image_license_url:place.image_candidate_license_url,image_status:'stored',image_review_reason:null,image_candidate_url:null,image_candidate_source_url:null,image_candidate_author:null,image_candidate_license:null,image_candidate_license_url:null};
    }else{
      update={image_status:'missing',image_review_reason:action==='reject'?'Rejected during photo review.':'No suitable photo available.',image_candidate_url:null,image_candidate_source_url:null,image_candidate_author:null,image_candidate_license:null,image_candidate_license_url:null};
    }
    const {data:saved,error:updateError}=await admin.from('places').update(update).eq('id',id).select('id,image_status,image_url,image_review_reason').single();
    if(updateError)throw updateError;
    return json({place:saved});
  }catch(error){console.error('Place photo review error',error);return json({error:'Photo review is unavailable right now.'},502);}
});