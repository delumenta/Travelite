// Travelite transport checks: per-trip user estimates, not routing data.
export const transportFlag=p=>p?.timing_intelligence?.constraint_profile?.transport||'normal_or_unknown';
export const needsTransport=p=>['limited_transit','special_transport','car_recommended','car_required','long_distance_access','verify_last_mile','verify_if_remote'].includes(transportFlag(p));
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const validMinutes=v=>Number.isInteger(Number(v))&&Number(v)>0&&Number(v)<=1440;
export const validTransportCheck=v=>Boolean(v&&['driving','public_transport','private_driver'].includes(v.mode)&&String(v.origin||'').trim()&&validMinutes(v.inbound)&&validMinutes(v.outbound)&&v.confirmed===true);
export function renderTransportCheck(p,v={}){
 if(!needsTransport(p))return '';
 const c=p.timing_intelligence?.constraint_profile||{},id=String(p.id);
 const option=(value,label)=>'<option value="'+value+'" '+(v.mode===value?'selected':'')+'>'+label+'</option>';
 return '<div class="card transport-card"><b>⚠ Transport check · '+escapeHtml(p.name)+'</b><div class="meta">'+escapeHtml(c.transport_note||'Double-check your journey and transport arrangements.')+'</div>'+
 '<label>Transport</label><select data-tid="'+id+'" data-field="mode">'+option('','Choose transport')+option('driving','Driving')+option('public_transport','Public transport')+option('private_driver','Private driver / tour')+'</select>'+
 '<label>Travelling from (previous stop or hotel)</label><input data-tid="'+id+'" data-field="origin" maxlength="200" value="'+escapeHtml(v.origin||'')+'" placeholder="e.g. Kōyasan">'+
 '<div class="row"><div><label>Journey here (min)</label><input type="number" min="1" max="1440" data-tid="'+id+'" data-field="inbound" value="'+escapeHtml(v.inbound||'')+'" placeholder="90"></div><div><label>Onward / return (min)</label><input type="number" min="1" max="1440" data-tid="'+id+'" data-field="outbound" value="'+escapeHtml(v.outbound||'')+'" placeholder="60"></div></div>'+
 '<label class="confirm"><input type="checkbox" data-tid="'+id+'" data-field="confirmed" '+(v.confirmed?'checked':'')+'> I have checked these estimates</label><div class="meta">Optional. Incomplete checks stay visible in the itinerary.</div></div>';
}
export function collectTransportChecks(root,previous={}){
 const checks={...previous};
 root.querySelectorAll('[data-tid]').forEach(e=>{
  const id=e.dataset.tid,field=e.dataset.field,v=checks[id]||(checks[id]={});
  v[field]=field==='confirmed'?e.checked:e.value;
 });
 return checks;
}
export function transportStorageKey(start,end,bases){return 'travelite_transport_checks_v2:'+JSON.stringify([start,end,bases]);}
export function loadTransportChecks(key){try{return JSON.parse(sessionStorage.getItem(key)||'{}')}catch{return {}}}
export function saveTransportChecks(key,checks){try{sessionStorage.setItem(key,JSON.stringify(checks))}catch{}}
// Use only with an authenticated Supabase client and an existing owned trip.
// RLS enforces that the user can only write checks for trips they own.
export function routeSignature(date,previous,place,next){
 const key=p=>String(p?.place_id??p?.id??p?.name??p?.title??p?.location_name??'hotel').trim().toLowerCase();
 return JSON.stringify([date||'',key(previous),key(place),key(next)]);
}
export function savedCheckForRoute(row,signature){return Boolean(row?.confirmed&&row?.route_signature&&row.route_signature===signature);}
export async function saveTripTransportChecks(supabase,tripId,checks){
 const rows=Object.entries(checks).filter(([,v])=>validTransportCheck(v)).map(([placeId,v])=>({
  trip_id:tripId,place_id:Number(placeId),transport_mode:v.mode,origin_label:v.origin.trim(),
  inbound_minutes:Number(v.inbound),onward_minutes:Number(v.outbound),confirmed:true,route_signature:v.routeSignature||null,checked_at:new Date().toISOString(),updated_at:new Date().toISOString()
 }));
 if(!rows.length)return {data:[],error:null};
 return supabase.from('trip_transport_checks').upsert(rows,{onConflict:'trip_id,place_id'});
}
