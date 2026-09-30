const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distanceKm=(a,b)=>{
  if(!a||!b||a.latitude==null||a.longitude==null||b.latitude==null||b.longitude==null)return null;
  const r=6371,rad=Math.PI/180, dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;
  const q=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(q));
};
const centroid=rows=>{const valid=rows.filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)));if(!valid.length)return {latitude:null,longitude:null};return {latitude:valid.reduce((s,x)=>s+Number(x.latitude),0)/valid.length,longitude:valid.reduce((s,x)=>s+Number(x.longitude),0)/valid.length};};
const cardTitle=rows=>{const names=rows.map(x=>x.name||x.title).filter(Boolean);return names.length<=2?names.join(' + '):`${names[0]} + ${names.length-1} nearby`;};
export function buildUndatedCards(input,{maxStops=5,maxRadiusKm=2.5}={}){
  const remaining=[...input],cards=[];
  while(remaining.length){
    const seed=remaining.shift(),rows=[seed];
    while(rows.length<maxStops&&remaining.length){
      const centre=centroid(rows);
      let best=-1,bestDistance=Infinity;
      remaining.forEach((row,index)=>{const d=distanceKm(centre,row);if(d!=null&&d<bestDistance){best=index;bestDistance=d;}});
      if(best<0||bestDistance>maxRadiusKm)break;
      rows.push(remaining.splice(best,1)[0]);
    }
    const totalKm=rows.reduce((sum,row,index)=>sum+(index?distanceKm(rows[index-1],row)||0:0),0);
    const score=clamp(Math.round(rows.length*12+totalKm*8),8,100);
    const effort=score>=65?'red':score>=38?'yellow':'green';
    cards.push({title:cardTitle(rows),items:rows,centre:centroid(rows),distanceKm:totalKm,score,effort});
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
