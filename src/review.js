import { createClient } from '@supabase/supabase-js';
import './review.css';

const SB_URL='https://zngncasvdrrxyrkjqutj.supabase.co';
const SB_KEY='sb_publishable_wUrH6t12z4tRKruS28LqWQ_2GG06U9m';
const sb=createClient(SB_URL,SB_KEY);
const app=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],index=0,building=false;

async function load(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user){app.innerHTML='<section class="empty"><h1>Sign in to Travelite first.</h1><a href="./">Open Travelite</a></section>';return;}
  const [{data:reviews,error},{data:counts}]=await Promise.all([
    sb.from('places').select('id,name,city,country,place_type,image_candidate_url,image_candidate_source_url,image_candidate_author,image_candidate_license,image_candidate_license_url,image_review_reason').eq('status','active').eq('image_status','review').order('name'),
    sb.from('places').select('image_status').eq('status','active')
  ]);
  if(error){app.innerHTML='<section class="empty"><h1>Could not load reviews.</h1></section>';return;}
  items=reviews||[];
  const tally=(counts||[]).reduce((a,row)=>{a[row.image_status]=(a[row.image_status]||0)+1;return a;},{});
  index=Math.min(index,Math.max(items.length-1,0));
  render(tally);
  if(!building&&(tally.pending||0)>0)buildCandidates();
}
function render(tally={}){
  const item=items[index];
  app.innerHTML=`<header><a class="brand" href="./">◉ travelite<span>.</span></a><a class="back" href="./">Back to app</a></header>
  <section class="intro"><p>PHOTO QUALITY CHECK</p><h1>Only the doubtful ones need you.</h1><div class="stats"><span>${tally.stored||0} auto-approved</span><span>${items.length} need review</span><span>${tally.pending||0} still checking</span></div></section>
  ${!item?'<section class="empty"><h2>No uncertain photos waiting.</h2><p>Candidate checks will appear here automatically if something needs your eye.</p></section>':
  `<section class="review"><div class="progress">${index+1} / ${items.length}</div><div class="image">${item.image_candidate_url?`<img src="${esc(item.image_candidate_url)}" alt="${esc(item.name)}">`:'<div class="no-image">No preview available</div>'}</div><div class="details"><p class="label">PLACE TO SEE</p><h2>${esc(item.name)}</h2><p class="meta">${esc([item.city,item.country,item.place_type].filter(Boolean).join(' · '))}</p><p class="reason">${esc(item.image_review_reason||'Needs your review.')}</p>${item.image_candidate_source_url?`<a class="source" href="${esc(item.image_candidate_source_url)}" target="_blank" rel="noopener">Open original image ↗</a>`:''}<p class="credit">${esc(item.image_candidate_author||'Unknown author')}${item.image_candidate_license?' · '+esc(item.image_candidate_license):''}</p><div class="actions"><button class="reject" data-action="reject">Not right</button><button class="missing" data-action="missing">No photo</button><button class="approve" data-action="approve">Yes, use this photo</button></div><div class="nav"><button data-action="prev" ${index===0?'disabled':''}>← Previous</button><button data-action="next" ${index>=items.length-1?'disabled':''}>Next →</button></div></div></section>`}`;
}
async function review(action){
  const item=items[index];if(!item)return;
  const {error}=await sb.functions.invoke('place-photo-review',{body:{place_id:item.id,action}});
  if(error){alert('Could not save that review. Try again.');return;}
  items.splice(index,1);index=Math.min(index,Math.max(items.length-1,0));await load();
}
async function buildCandidates(){
  building=true;
  try{
    for(let i=0;i<260;i++){
      const {data,error}=await sb.functions.invoke('place-photo',{body:{mode:'next',limit:3}});
      if(error||data?.error||!data?.pending)break;
      await new Promise(resolve=>setTimeout(resolve,300));
    }
  }finally{building=false;await load();}
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action;if(a==='prev'){index--;load();}else if(a==='next'){index++;load();}else review(a);});
load();