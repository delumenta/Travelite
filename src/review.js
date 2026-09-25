import { createClient } from '@supabase/supabase-js';
import './review.css';
const SB_URL='https://zngncasvdrrxyrkjqutj.supabase.co';
const SB_KEY='sb_publishable_wUrH6t12z4tRKruS28LqWQ_2GG06U9m';
const sb=createClient(SB_URL,SB_KEY);
const app=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[];
async function load(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session?.user){app.innerHTML='<section class="empty"><h1>Sign in to Travelite first.</h1><a href="./">Open Travelite</a></section>';return;}
 const {data,error}=await sb.from('places').select('id,name,city,country,place_type,image_url,image_status,image_review_reason').eq('status','active').order('name');
 if(error){app.innerHTML='<section class="empty"><h1>Could not load photos.</h1></section>';return;}
 items=data||[];render();
}
function render(){
 const stored=items.filter(x=>x.image_status==='stored'&&x.image_url).length;
 app.innerHTML=`<header><a class="brand" href="./">◉ travelite<span>.</span></a><a class="back" href="./">Back to app</a></header>
 <section class="intro"><p>PHOTO LIBRARY</p><h1>Every place, in one review screen.</h1><div class="stats"><span>${stored} photos published</span><span>${items.length-stored} still need a photo</span><span>Tap Edit photo only when you want to replace one</span></div></section>
 <main class="photo-grid">${items.map(x=>`<article class="photo-card"><div class="photo-preview">${x.image_url?`<img src="${esc(x.image_url)}" alt="${esc(x.name)}" loading="lazy">`:'<div class="no-image">No photo yet</div>'}</div><div class="photo-info"><h2>${esc(x.name)}</h2><p>${esc([x.city,x.country,x.place_type].filter(Boolean).join(' · '))}</p><label class="edit-photo">Edit photo<input type="file" accept="image/jpeg,image/png,image/webp" data-place-id="${x.id}" hidden></label></div></article>`).join('')}</main>`;
}
async function upload(input){
 const file=input.files?.[0];const id=Number(input.dataset.placeId);if(!file||!id)return;
 if(file.size>5*1024*1024){alert('Please choose an image smaller than 5 MB.');input.value='';return;}
 const reader=new FileReader();
 reader.onload=async()=>{try{input.closest('.photo-card').classList.add('uploading');const base64=String(reader.result).split(',')[1];const {error}=await sb.functions.invoke('place-photo-review',{body:{place_id:id,action:'upload',image_data:base64,mime:file.type}});if(error)throw error;await load();}catch(e){alert('Could not upload that image. Try again.');input.closest('.photo-card').classList.remove('uploading');}};
 reader.readAsDataURL(file);
}
document.addEventListener('change',e=>{if(e.target.matches('input[data-place-id]'))upload(e.target);});
load();