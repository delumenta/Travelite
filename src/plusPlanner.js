const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distanceKm=(a,b)=>{
  if(!a||!b||a.latitude==null||a.longitude==null||b.latitude==null||b.longitude==null)return null;
  const r=6371,rad=Math.PI/180, dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;
  const q=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(q));
};
const centroid=rows=>{const valid=rows.filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)));if(!valid.length)return {latitude:null,longitude:null};return {latitude:valid.reduce((s,x)=>s+Number(x.latitude),0)/valid.length,longitude:valid.reduce((s,x)=>s+Number(x.longitude),0)/valid.length};};
const cardTitle=rows=>{const names=rows.map(x=>x.name||x.title).filter(Boolean);return names.length<=2?names.join(' + '):`${names[0]} + ${names.length-1} nearby`;};
const norm=v=>String(v??'').trim().toLowerCase();
const timingOf=row=>row?.timing_intelligence||row?.timingIntelligence||{};
const windowsOf=row=>Array.isArray(row?.time_windows)?row.time_windows:[];
const hardWindowFamily=row=>{
  const kinds=windowsOf(row).filter(w=>['ideal','strong'].includes(norm(w.strength))).map(w=>norm(w.window_kind)+' '+norm(w.label));
  if(kinds.some(v=>v.includes('sunrise')||v.includes('dawn')))return 'dawn';
  if(kinds.some(v=>v.includes('sunset')))return 'sunset';
  return '';
};
const sceneOf=row=>({
  region:norm(row?.region), area:norm(row?.area),
  daypart:norm(timingOf(row).preferred_daypart||row?.preferred_daypart),
  behavior:norm(timingOf(row).schedule_behavior||row?.schedule_behavior)
});
const daypartFamily=v=>{
  if(!v)return '';
  if(v.includes('dawn')||v.includes('sunrise')||v.includes('early_morning'))return 'early';
  if(v.includes('morning'))return 'morning';
  if(v.includes('sunset')||v.includes('evening'))return 'evening';
  if(v.includes('night')||v.includes('after_dark'))return 'night';
  return v;
};
const sceneCompatible=(a,b,maxRadiusKm)=>{
  const d=distanceKm(a,b); if(d==null||d>maxRadiusKm)return false;
  const hardA=hardWindowFamily(a),hardB=hardWindowFamily(b);
  // Two separate strong dawn/sunrise anchors should not be silently packed into one day card.
  if(hardA==='dawn'&&hardB==='dawn')return false;
  const A=sceneOf(a),B=sceneOf(b);
  // Region is a planning boundary inside large destinations: East Kyoto and South Kyoto
  // are not the same outing merely because both pins say city=Kyoto.
  if(A.region&&B.region&&A.region!==B.region)return false;
  const da=daypartFamily(A.daypart),db=daypartFamily(B.daypart);
  if(da&&db&&da!==db&&((da==='early'&&['evening','night'].includes(db))||(db==='early'&&['evening','night'].includes(da))))return false;
  if((A.behavior.includes('sunset_lock')&&db==='early')||(B.behavior.includes('sunset_lock')&&da==='early'))return false;
  return true;
};
export function buildUndatedCards(input,{maxStops=5,maxRadiusKm=2.5,pace='balanced',crowdPreference='balanced'}={}){
  if(pace==='chill')maxStops=Math.min(maxStops,3);
  if(pace==='packed')maxStops=Math.max(maxStops,6);
  const remaining=[...input],cards=[];
  while(remaining.length){
    const seed=remaining.shift(),rows=[seed];
    while(rows.length<maxStops&&remaining.length){
      const centre=centroid(rows);
      let best=-1,bestDistance=Infinity;
      remaining.forEach((row,index)=>{
        const d=distanceKm(centre,row);
        if(d!=null&&d<bestDistance&&rows.every(existing=>sceneCompatible(existing,row,maxRadiusKm))){best=index;bestDistance=d;}
      });
      if(best<0||bestDistance>maxRadiusKm)break;
      rows.push(remaining.splice(best,1)[0]);
    }
    const totalKm=rows.reduce((sum,row,index)=>sum+(index?distanceKm(rows[index-1],row)||0:0),0);
    const score=clamp(Math.round(rows.length*12+totalKm*8),8,100);
    const effort=score>=65?'red':score>=38?'yellow':'green';
    cards.push({title:cardTitle(rows),items:rows,centre:centroid(rows),distanceKm:totalKm,score,effort,pace,crowdPreference,scene:{region:sceneOf(seed).region||null,area:sceneOf(seed).area||null,daypart:sceneOf(seed).daypart||null}});
  }
  return cards.sort((a,b)=>b.score-a.score).map((card,index)=>({...card,order:index+1}));
}

export function balanceCards(cards,dates){
  const result=Array.from({length:dates.length},(_,index)=>({date:dates[index],cards:[],score:0}));
  const ordered=[...cards].sort((a,b)=>b.score-a.score);
  ordered.forEach(card=>{
    const candidates=result.filter(day=>day.cards.length<2||card.effort!=='red');
    const pool=candidates.length?candidates:result;
    pool.sort((a,b)=>a.score-b.score||a.cards.length-b.cards.length);
    pool[0].cards.push(card);pool[0].score+=card.score;
  });
  return result;
}
export function flattenBalancedDays(days){return days.flatMap(day=>day.cards.flatMap(card=>card.items.map((item,index)=>({...item,schedule_date:day.date,sort_order:index+1,card_title:card.title,effort_level:card.effort}))))}


// Internal under-specification / day-trip opportunity logic.
// This does not hard-code destinations. It only decides WHEN Travelite should
// look for an excursion; destination discovery remains data-driven.
export function assessTripCapacity({tripDays=0,cards=[],targetDayScore=55}={}){
  const days=Math.max(0,Number(tripDays)||0);
  if(!days)return {underSpecified:false,plannedDayEquivalents:0,openDayEquivalents:0,mode:'no_dates'};
  const totalLoad=(cards||[]).reduce((sum,card)=>sum+clamp(Number(card?.score)||0,0,100),0);
  const plannedDayEquivalents=Math.min(days,totalLoad/Math.max(1,targetDayScore));
  const openDayEquivalents=Math.max(0,days-plannedDayEquivalents);
  const underSpecified=openDayEquivalents>=0.75;
  return {
    underSpecified,
    plannedDayEquivalents:Number(plannedDayEquivalents.toFixed(1)),
    openDayEquivalents:Number(openDayEquivalents.toFixed(1)),
    mode:underSpecified?'suggest_fill':'enough_content'
  };
}

export function shouldDiscoverDayTrips({tripDays=0,cards=[],userKeptLoose=false}={}){
  const capacity=assessTripCapacity({tripDays,cards});
  return {
    ...capacity,
    discover:capacity.underSpecified&&!userKeptLoose,
    choices:capacity.underSpecified?['add_local_scene','explore_day_trip','keep_it_loose']:[]
  };
}

export function qualifyDayTripCandidate(candidate,{baseCities=[],maxMinutes=540,targetMinutes=480}={}){
  const destination=String(candidate?.destination||candidate?.city||'').trim();
  const bases=(baseCities||[]).map(x=>String(x||'').trim().toLowerCase()).filter(Boolean);
  if(!destination)return {eligible:false,reason:'missing_destination'};
  if(bases.includes(destination.toLowerCase()))return {eligible:false,reason:'already_a_base'};
  const poiCount=Number(candidate?.usablePoiCount??candidate?.pois?.length??0);
  if(poiCount<2)return {eligible:false,reason:'not_enough_pois'};
  if(candidate?.geographicallyCoherent===false)return {eligible:false,reason:'poor_geography'};
  const total=Number(candidate?.totalMinutes);
  if(!Number.isFinite(total))return {eligible:false,reason:'needs_route_time'};
  if(total>maxMinutes)return {eligible:false,reason:'over_nine_hours',totalMinutes:total};
  return {
    eligible:true,
    reason:'valid_return_excursion',
    totalMinutes:total,
    durationBand:total<=targetMinutes?'about_eight_hours':'eight_to_nine_hours'
  };
}


// Destination transport graph helpers.
// Same graph, different semantics:
// - excursion: A -> B -> A and must fit the day cap
// - base transfer: A -> B once; the minutes reduce usable time on the incoming-base day.
export function transportGraphMinutes(fromDestinationId,toDestinationId,{anchors=[],estimates=[]}={}){
  if(fromDestinationId==null||toDestinationId==null)return null;
  if(String(fromDestinationId)===String(toDestinationId))return 0;
  const starts=new Set(anchors.filter(a=>String(a.destination_id)===String(fromDestinationId)).map(a=>a.id));
  const goals=new Set(anchors.filter(a=>String(a.destination_id)===String(toDestinationId)).map(a=>a.id));
  if(!starts.size||!goals.size)return null;
  const adj=new Map();
  for(const e of estimates){if(e.active===false)continue;if(!adj.has(e.from_anchor_id))adj.set(e.from_anchor_id,[]);adj.get(e.from_anchor_id).push([e.to_anchor_id,Number(e.typical_minutes)]);}
  const dist=new Map(),queue=[];
  for(const id of starts){dist.set(id,0);queue.push([0,id]);}
  while(queue.length){
    queue.sort((a,b)=>a[0]-b[0]);const [d,u]=queue.shift();if(d!==dist.get(u))continue;if(goals.has(u))return Math.round(d);
    for(const [v,w] of adj.get(u)||[]){if(!Number.isFinite(w))continue;const nd=d+w;if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);queue.push([nd,v]);}}
  }
  return null;
}
export function baseForDate(date,bases=[]){
  const ordered=[...(bases||[])].sort((a,b)=>String(a.start_date||a.from||'').localeCompare(String(b.start_date||b.from||'')));
  const hits=ordered.filter(b=>String(b.start_date||b.from||'')<=date&&String(b.end_date||b.to||'')>=date);
  return hits.length?hits[hits.length-1]:null; // shared boundary belongs to incoming base
}
export function baseTransferForDate(date,bases=[],destinations=[],graph={}){
  const ordered=[...(bases||[])].sort((a,b)=>String(a.start_date||a.from||'').localeCompare(String(b.start_date||b.from||'')));
  const current=baseForDate(date,ordered);if(!current)return null;
  const i=ordered.indexOf(current);if(i<=0)return null;
  const previous=ordered[i-1];
  const city=x=>String(x?.city||x?.name||'').trim().toLowerCase();
  if(city(previous)===city(current))return null;
  const find=x=>destinations.find(d=>String(d.id)===String(x.destination_id)||String(d.name||'').trim().toLowerCase()===city(x));
  const from=find(previous),to=find(current);
  const minutes=from&&to?transportGraphMinutes(from.id,to.id,graph):null;
  return {kind:'base_transfer',from:previous,to:current,fromDestination:from||null,toDestination:to||null,minutes,returnRequired:false};
}
export function excursionTransport({baseDestinationId,targetDestinationId,sceneMinutes=0,localTransferMinutes=30,mealMinutes=60,maxDayMinutes=540,graph={}}={}){
  const oneWay=transportGraphMinutes(baseDestinationId,targetDestinationId,graph);
  if(oneWay==null)return {eligible:false,reason:'needs_route_time'};
  const total=oneWay*2+Number(sceneMinutes||0)+Number(localTransferMinutes||0)+Number(mealMinutes||0);
  return {eligible:total<=maxDayMinutes,reason:total<=maxDayMinutes?'valid_return_excursion':'over_nine_hours',oneWayMinutes:oneWay,returnMinutes:oneWay,totalMinutes:total,remainingMinutes:Math.max(0,maxDayMinutes-oneWay*2-localTransferMinutes-mealMinutes)};
}


const isoDate=v=>String(v||'').slice(0,10);
const baseCity=b=>String(b?.city||b?.name||'').trim();
const destinationForBase=(base,destinations=[])=>{
  const city=baseCity(base).toLowerCase();
  return destinations.find(d=>String(d.id)===String(base?.destination_id||base?.destination_place_id))
    ||destinations.find(d=>String(d.name||'').trim().toLowerCase()===city)
    ||null;
};
export function buildTripDayContexts({dates=[],bases=[],destinations=[],graph={}}={}){
  const ordered=[...(bases||[])].sort((a,b)=>isoDate(a.start_date||a.from).localeCompare(isoDate(b.start_date||b.from))||(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  return (dates||[]).map(date=>{
    const base=baseForDate(date,ordered);
    const index=base?ordered.indexOf(base):-1;
    const previous=index>0?ordered[index-1]:null;
    const isIncomingBoundary=!!(base&&previous&&isoDate(base.start_date||base.from)===date&&isoDate(previous.end_date||previous.to)===date&&baseCity(base).toLowerCase()!==baseCity(previous).toLowerCase());
    let transfer=null;
    if(isIncomingBoundary){
      const fromDestination=destinationForBase(previous,destinations),toDestination=destinationForBase(base,destinations);
      transfer={kind:'base_transfer',from:previous,to:base,fromDestination,toDestination,minutes:fromDestination&&toDestination?transportGraphMinutes(fromDestination.id,toDestination.id,graph):null,returnRequired:false};
    }
    return {date,base,previousBase:previous,isTransferDay:isIncomingBoundary,transfer,availableMinutes:Math.max(0,540-Number(transfer?.minutes||0))};
  });
}
export function destinationForPlace(place,destinations=[]){
  if(place?.destination_id!=null){const exact=destinations.find(d=>String(d.id)===String(place.destination_id));if(exact)return exact;}
  const values=[place?.city,place?.area,place?.region].filter(Boolean).map(x=>String(x).trim().toLowerCase());
  return destinations.find(d=>values.includes(String(d.name||'').trim().toLowerCase()))||null;
}
export function assignCardsToTripDays(cards,{dates=[],bases=[],destinations=[],graph={},maxDayMinutes=540,pace='balanced',crowdPreference='balanced'}={}){
  const paceCap=pace==='chill'?420:pace==='packed'?540:480;
  maxDayMinutes=Math.min(maxDayMinutes,paceCap);
  const days=buildTripDayContexts({dates,bases,destinations,graph}).map(d=>({...d,cards:[],score:0,usedMinutes:0}));
  const cardMinutes=card=>(card.items||[]).reduce((s,p)=>s+Number(p.estimated_minutes_max||p.estimated_minutes_min||60),0)+Math.max(0,(card.items?.length||0)-1)*30;
  for(const card of [...(cards||[])].sort((a,b)=>b.score-a.score)){
    const destinationsInCard=[...new Set((card.items||[]).map(p=>destinationForPlace(p,destinations)?.id).filter(Boolean))];
    const candidates=days.map(day=>{
      if(!day.base)return null;
      const baseDest=destinationForBase(day.base,destinations);if(!baseDest)return null;
      const sceneMinutes=cardMinutes(card);
      let travelMinutes=0,kind='local',eligible=true;
      for(const targetId of destinationsInCard){
        if(String(targetId)===String(baseDest.id))continue;
        const trip=excursionTransport({baseDestinationId:baseDest.id,targetDestinationId:targetId,sceneMinutes,graph,maxDayMinutes});
        if(!trip.eligible){eligible=false;break;}
        kind='day_trip';travelMinutes=Math.max(travelMinutes,trip.oneWayMinutes*2);
      }
      const required=sceneMinutes+travelMinutes;
      if(required>day.availableMinutes)eligible=false;
      return eligible?{day,required,kind,travelMinutes}:null;
    }).filter(Boolean).sort((a,b)=>(a.day.usedMinutes+a.required)-(b.day.usedMinutes+b.required)||a.day.score-b.day.score);
    if(!candidates.length)continue;
    const pick=candidates[0];pick.day.cards.push({...card,travelKind:pick.kind,travelMinutes:pick.travelMinutes});pick.day.usedMinutes+=pick.required;pick.day.score+=card.score;
  }
  return days;
}
