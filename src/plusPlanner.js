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
const listify=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
const profileOf=row=>row?.planning_profile||row?.place_planning_profile||row?.planningProfile||{};
const relationList=(row,key)=>listify(profileOf(row)?.[key]??row?.[key]).map(norm).filter(Boolean);
const durationOf=row=>clamp(Number(
  row?.typical_duration_min??row?.typical_duration_minutes??
  row?.estimated_minutes_max??row?.estimated_minutes_min??
  profileOf(row)?.typical_duration_min??profileOf(row)?.typical_duration_minutes??60
),15,360);
const minUsefulOf=row=>clamp(Number(row?.minimum_useful_time_min??profileOf(row)?.minimum_useful_time_min??Math.min(durationOf(row),45)),15,360);
const timingClass=row=>norm(timingOf(row).timing_class||row?.timing_class);
const hardConstraint=row=>['hard_scheduled_entry','hard_full_day_access','event_schedule_constraint'].includes(timingClass(row))||timingOf(row).hard_constraints;
const pairGroup=row=>norm(profileOf(row).pairing_group||row?.pairing_group);
const antiPairs=row=>relationList(row,'anti_pairs').concat(relationList(row,'anti_pairings'));
const supports=row=>relationList(row,'supports');
const anchors=row=>relationList(row,'anchors').concat(relationList(row,'anchor_for'));
const placeKey=row=>norm(row?.place_key||row?.slug||row?.name);

const timingCompatible=(a,b)=>{
  const wa=windowsOf(a),wb=windowsOf(b);
  if(!wa.length||!wb.length)return true;
  const solarA=wa.filter(w=>['sunrise','sunset','golden_hour','dusk'].includes(norm(w.window_kind)));
  const solarB=wb.filter(w=>['sunrise','sunset','golden_hour','dusk'].includes(norm(w.window_kind)));
  if(solarA.some(w=>norm(w.window_kind)==='sunrise')&&solarB.some(w=>norm(w.window_kind)==='sunrise'))return false;
  if(solarA.some(w=>norm(w.window_kind)==='sunset')&&solarB.some(w=>norm(w.window_kind)==='sunset')&&
     hardWindowFamily(a)==='sunset'&&hardWindowFamily(b)==='sunset')return false;
  return true;
};

const hardPairConflict=(a,b)=>{
  const ak=placeKey(a),bk=placeKey(b);
  if(antiPairs(a).includes(bk)||antiPairs(b).includes(ak))return true;
  const aa=anchors(a),ab=anchors(b),sa=supports(a),sb=supports(b);
  if(aa.includes(bk)&&hardConstraint(b))return true;
  if(ab.includes(ak)&&hardConstraint(a))return true;
  return false;
};

const candidatePackScore=(row,rows,centre,crowdPreference)=>{
  const d=distanceKm(centre,row)??99;
  let score=100-d*20;
  const g=pairGroup(row);
  if(g&&rows.some(x=>pairGroup(x)===g))score+=35;
  if(rows.some(x=>pairGroup(x)&&g&&pairGroup(x)!==g))score+=5;
  if(rows.some(x=>supports(row).includes(placeKey(x))||supports(x).includes(placeKey(row))))score+=30;
  if(hardConstraint(row))score-=15;
  const tw=windowsOf(row);
  if(tw.length){
    const best=Math.max(...tw.map(w=>windowScore({...w,experienceScore:w.experience_score,crowdScore:w.crowd_score},crowdPreference)));
    score+=best*.08;
  }
  return score;
};

const sceneCompatible=(a,b,maxRadiusKm,{maxMinutes=540,crowdPreference='balanced',rows=[]}={})=>{
  const d=distanceKm(a,b); if(d==null||d>maxRadiusKm)return false;
  if(hardPairConflict(a,b))return false;
  const hardA=hardWindowFamily(a),hardB=hardWindowFamily(b);
  if(hardA==='dawn'&&hardB==='dawn')return false;
  const A=sceneOf(a),B=sceneOf(b);
  if(A.region&&B.region&&A.region!==B.region)return false;
  const da=daypartFamily(A.daypart),db=daypartFamily(B.daypart);
  if(da&&db&&da!==db&&((da==='early'&&['evening','night'].includes(db))||(db==='early'&&['evening','night'].includes(da))))return false;
  if((A.behavior.includes('sunset_lock')&&db==='early')||(B.behavior.includes('sunset_lock')&&da==='early'))return false;
  if(!timingCompatible(a,b))return false;
  const minutes=[...rows,a,b].reduce((sum,x)=>sum+durationOf(x),0);
  if(minutes>maxMinutes)return false;
  return true;
};

export function buildUndatedCards(input,{maxStops=5,maxRadiusKm=2.5,pace='balanced',crowdPreference='balanced',maxSceneMinutes=540}={}){
  if(pace==='chill')maxStops=Math.min(maxStops,3);
  if(pace==='packed')maxStops=Math.max(maxStops,6);
  const remaining=[...input],cards=[];
  while(remaining.length){
    const seed=remaining.shift(),rows=[seed];
    while(rows.length<maxStops&&remaining.length){
      const centre=centroid(rows);
      let best=-1,bestScore=-Infinity;
      remaining.forEach((row,index)=>{
        if(!rows.every(existing=>sceneCompatible(existing,row,maxRadiusKm,{maxMinutes:maxSceneMinutes,crowdPreference,rows})))return;
        const score=candidatePackScore(row,rows,centre,crowdPreference);
        if(score>bestScore){best=index;bestScore=score;}
      });
      if(best<0)break;
      rows.push(remaining.splice(best,1)[0]);
    }
    const totalKm=rows.reduce((sum,row,index)=>sum+(index?distanceKm(rows[index-1],row)||0:0),0);
    const totalMinutes=rows.reduce((sum,row)=>sum+durationOf(row),0);
    const score=clamp(Math.round(rows.length*12+totalKm*8+(totalMinutes/30)),8,100);
    const effort=score>=65?'red':score>=38?'yellow':'green';
    cards.push({title:cardTitle(rows),items:rows,centre:centroid(rows),distanceKm:totalKm,totalMinutes,score,effort,pace,crowdPreference,
      constraints:rows.map(x=>({placeKey:placeKey(x),durationMin:durationOf(x),minimumUsefulMin:minUsefulOf(x),timingClass:timingClass(x),hardConstraint:!!hardConstraint(x),pairingGroup:pairGroup(x)})),
      scene:{region:sceneOf(seed).region||null,area:sceneOf(seed).area||null,daypart:sceneOf(seed).daypart||null}});
  }
  return cards.sort((a,b)=>b.score-a.score).map((card,index)=>({...card,order:index+1}));
}

const numericProfile=row=>{
  const p=profileOf(row);
  return {
    duration:durationOf(row),
    walkingKm:Number(row?.walking_km??p.walking_km??0)||0,
    stairs:Number(row?.stairs_count??p.stairs_count??0)||0,
    elevation:Number(row?.elevation_gain_m??p.elevation_gain_m??0)||0,
    travelMin:Number(row?.travel_minutes??p.travel_minutes??0)||0,
    transitions:Number(row?.transition_count??p.transition_count??0)||0,
    early:!!(p.early_start_required||timingOf(row).early_start_required),
    late:!!(p.late_finish_required||timingOf(row).late_finish_required),
    pressure:Number(row?.time_pressure??p.time_pressure??0)||0,
    hard:!!hardConstraint(row)
  };
};

export function calculateDayEffort(card,{pace='balanced'}={}){
  const items=card?.items||[];
  const stats=items.reduce((s,row)=>{
    const x=numericProfile(row);
    s.duration+=x.duration;s.walkingKm+=x.walkingKm;s.stairs+=x.stairs;s.elevation+=x.elevation;
    s.travelMin+=x.travelMin;s.transitions+=x.transitions;s.early+=x.early?1:0;s.late+=x.late?1:0;s.pressure+=x.pressure;s.hard+=x.hard?1:0;
    return s;
  },{duration:0,walkingKm:0,stairs:0,elevation:0,travelMin:0,transitions:0,early:0,late:0,pressure:0,hard:0});
  // When detailed walking/elevation data is absent, the existing scene distance
  // remains the fallback so effort never becomes falsely "chill".
  const walking=stats.walkingKm>0?stats.walkingKm:Number(card?.distanceKm||0);
  const travel=stats.travelMin+Math.max(0,Number(card?.distanceKm||0)-walking)*8;
  let score=0;
  score+=clamp(stats.duration/30,0,12)*4;
  score+=clamp(walking,0,18)*2.2;
  score+=clamp(travel/30,0,8)*2;
  score+=clamp(stats.stairs/250,0,8)*5;
  score+=clamp(stats.elevation/250,0,8)*5;
  score+=clamp(stats.transitions,0,8)*3;
  score+=stats.early*8+stats.late*6;
  score+=clamp(stats.pressure,0,20)*2;
  score+=Math.max(0,items.length-3)*5;
  if(stats.hard>1)score+=8;
  const paceAdj=pace==='chill'?8:pace==='packed'?-6:0;
  score=clamp(Math.round(score+paceAdj),0,100);
  const effort=score>=65?'red':score>=38?'yellow':'green';
  return {...card,effortScore:score,effort,effortStats:{...stats,walkingKm:walking,travelMin:Math.round(travel)}};
}

const dateBlocked=(date,card,blockedDates=[])=>blockedDates.map(String).includes(String(date))||listify(card?.blocked_dates).map(String).includes(String(date));
const dateFitsCard=(date,card,{blockedDates=[],dateRules=[]}={})=>{
  if(dateBlocked(date,card,blockedDates))return false;
  const rule=(dateRules||[]).find(r=>String(r.date)===String(date));
  if(rule?.closed)return false;
  const fixed=card?.fixedDate||card?.fixed_date||null;
  if(fixed&&String(fixed)!==String(date))return false;
  const weekday=String(new Date(String(date)+'T12:00:00Z').getUTCDay());
  if(listify(card?.closed_weekdays).map(String).includes(weekday))return false;
  return true;
};
export function balanceCards(cards,dates,{pace='balanced',fixedAssignments=[],blockedDates=[],dateRules=[]}={}){
  const scored=(cards||[]).map(card=>calculateDayEffort(card,{pace}));
  const result=Array.from({length:dates.length},(_,index)=>({date:dates[index],cards:[],score:0,effortScore:0,effort:'green'}));
  const fixed=new Map((fixedAssignments||[]).map(x=>[String(x.cardId||x.card_id),String(x.date)]));
  const ordered=[...scored].sort((a,b)=>{
    const ah=fixed.has(String(a.id||a.cardId)),bh=fixed.has(String(b.id||b.cardId));
    return Number(bh)-Number(ah)||b.effortScore-a.effortScore;
  });
  const add=(day,card)=>{
    day.cards.push(card);day.score+=Number(card.score||0);day.effortScore=clamp(Math.round(day.cards.reduce((s,x)=>s+(x.effortScore??0),0)),0,100);
    day.effort=day.effortScore>=65?'red':day.effortScore>=38?'yellow':'green';
  };
  for(const card of ordered){
    const fixedDate=fixed.get(String(card.id||card.cardId));
    let candidates=result.filter(day=>(!fixedDate||String(day.date)===fixedDate)&&dateFitsCard(day.date,card,{blockedDates,dateRules}));
    if(!fixedDate){
      candidates=result.filter(day=>day.cards.length<2&&dateFitsCard(day.date,card,{blockedDates,dateRules}));
      if(!candidates.length)candidates=result.filter(day=>dateFitsCard(day.date,card,{blockedDates,dateRules}));
      // Prefer a day whose current load is below the trip average, while avoiding
      // consecutive heavy days when another legal day is available.
      const ranked=[...candidates].sort((a,b)=>{
        const aPrev=result[result.indexOf(a)-1]?.effort==='red',bPrev=result[result.indexOf(b)-1]?.effort==='red';
        const aNext=result[result.indexOf(a)+1]?.effort==='red',bNext=result[result.indexOf(b)+1]?.effort==='red';
        return Number(aPrev||aNext)-Number(bPrev||bNext)||a.effortScore-b.effortScore||a.cards.length-b.cards.length;
      });
      candidates=ranked;
    }
    add(candidates[0]||result[0],card);
  }
  return result.map(day=>({...day,effortScore:clamp(day.effortScore,0,100)}));
}
/** Final calendar assignment: preserve cards, choose only legal dates. */
export function assignCardsToDates(cards,dates,options={}){
  const days=balanceCards(cards,dates,options);
  return days.map(day=>({...day,items:day.cards.flatMap(card=>card.items||[])}));
}
export function flattenBalancedDays(days){return days.flatMap(day=>day.cards.flatMap(card=>card.items.map((item,index)=>({...item,schedule_date:day.date,sort_order:index+1,card_title:card.title,effort_level:card.effort}))))}


// Internal under-specification / day-trip opportunity logic.
// This does not hard-code destinations. It only decides WHEN Travelite should
// look for an excursion; destination discovery remains data-driven.
export function assessTripCapacity({tripDays=0,cards=[],targetDayScore=55}={}){
  const days=Math.max(0,Number(tripDays)||0);
  if(!days)return {underSpecified:false,plannedDayEquivalents:0,openDayEquivalents:0,mode:'no_dates'};
  const totalLoad=(cards||[]).reduce((sum,card)=>sum+Math.max(Number(card?.effortScore??card?.score??0),8),0);
  const plannedDayEquivalents=Math.min(days,totalLoad/Math.max(1,targetDayScore));
  const openDayEquivalents=Math.max(0,days-plannedDayEquivalents);
  const underSpecified=openDayEquivalents>=0.75;
  return {underSpecified,plannedDayEquivalents:Number(plannedDayEquivalents.toFixed(1)),openDayEquivalents:Number(openDayEquivalents.toFixed(1)),mode:underSpecified?'suggest_fill':'enough_content'};
}

export function shouldDiscoverDayTrips({tripDays=0,cards=[],userKeptLoose=false}={}){
  const capacity=assessTripCapacity({tripDays,cards});
  return {...capacity,discover:capacity.underSpecified&&!userKeptLoose,choices:capacity.underSpecified?['add_local_scene','explore_day_trip','keep_it_loose']:[]};
}

/** Convert a curated scene/day-trip suggestion into a normal undated card. */
export function sceneSuggestionToCard(suggestion,{pace='balanced',crowdPreference='balanced'}={}){
  const items=listify(suggestion?.pois||suggestion?.places||suggestion?.items);
  if(!items.length)return null;
  const card=buildUndatedCards(items,{pace,crowdPreference,maxStops:Math.max(1,items.length),maxRadiusKm:9,maxSceneMinutes:540})[0];
  return card?{...card,kind:suggestion?.kind==='day_trip'?'day_trip':'city_scene',suggestionId:suggestion?.id??null,
    destination:suggestion?.destination||suggestion?.city||null}:null;
}

export function selectCitySceneOrDayTrip(suggestions,{type='any',baseCity='',existingCards=[]}={}){
  const existing=new Set(existingCards.flatMap(c=>(c.items||[]).map(placeKey)));
  const base=norm(baseCity);
  return (suggestions||[]).filter(s=>{
    const kind=norm(s.kind||s.type);
    if(type!=='any'&&kind!==type)return false;
    if(kind==='day_trip'&&base&&norm(s.baseCity||s.base_city)===base)return false;
    const items=listify(s.pois||s.places||s.items);
    return items.length>=2&&items.some(x=>!existing.has(placeKey(x)));
  });
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
  return {eligible:true,reason:'valid_return_excursion',totalMinutes:total,durationBand:total<=targetMinutes?'about_eight_hours':'eight_to_nine_hours'};
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
// Count each user-supplied leg once. Unverified routes retain an explicit warning.
export function assessCardTransport(card,date,checks=[],{signatureFor}={}){
 const items=card.items||[],warnings=[];let extraMinutes=0,hasUnverified=false;
 const lookup=id=>checks.find(c=>Number(c.place_id)===Number(id));
 for(let i=0;i<items.length;i++){
  const p=items[i],flag=p?.timing_intelligence?.constraint_profile?.transport;
  if(!['limited_transit','special_transport','car_recommended','car_required','long_distance_access','verify_last_mile','verify_if_remote'].includes(flag))continue;
  const previous=items[i-1]||null,next=items[i+1]||null,check=lookup(p.place_id??p.id);
  const signature=signatureFor?.(date,previous,p,next);
  if(!check?.confirmed||!signature||check.route_signature!==signature){
   hasUnverified=true;warnings.push({placeId:p.place_id??p.id,name:p.name||p.title,reason:check?.confirmed?'Route changed; reconfirm journey':'Transport unverified'});
   continue;
  }
  // Inbound replaces the generic 30-minute inter-stop estimate when there is a previous stop.
  extraMinutes+=Math.max(0,Number(check.inbound_minutes)||0)-(i>0?30:0);
  // Only the last stop needs an explicit onward/return leg; interior legs are counted inbound to their next stop.
  if(i===items.length-1)extraMinutes+=Math.max(0,Number(check.onward_minutes)||0);
 }
 return {extraMinutes,warnings,hasUnverified};
}
export function assignCardsToTripDays(cards,{dates=[],bases=[],destinations=[],graph={},maxDayMinutes=540,pace='balanced',crowdPreference='balanced',transportChecks=[],routeSignature}={}){
  const paceCap=pace==='chill'?420:pace==='packed'?540:480;
  maxDayMinutes=Math.min(maxDayMinutes,paceCap);
  const days=buildTripDayContexts({dates,bases,destinations,graph}).map(d=>({...d,cards:[],score:0,usedMinutes:0}));
  const cardMinutes=card=>(card.items||[]).reduce((s,p)=>s+Number(p.estimated_minutes_max||p.estimated_minutes_min||60),0)+Math.max(0,(card.items?.length||0)-1)*30;
  for(const card of [...(cards||[])].sort((a,b)=>b.score-a.score)){
    const destinationsInCard=[...new Set((card.items||[]).map(p=>destinationForPlace(p,destinations)?.id).filter(Boolean))];
    const candidates=days.map(day=>{
      if(!day.base)return null;
      const baseDest=destinationForBase(day.base,destinations);if(!baseDest)return null;
      const transport=assessCardTransport(card,day.date,transportChecks,{signatureFor:routeSignature});
      const sceneMinutes=cardMinutes(card)+transport.extraMinutes;
      let travelMinutes=0,kind='local',eligible=true;
      for(const targetId of destinationsInCard){
        if(String(targetId)===String(baseDest.id))continue;
        const trip=excursionTransport({baseDestinationId:baseDest.id,targetDestinationId:targetId,sceneMinutes,graph,maxDayMinutes});
        if(!trip.eligible){eligible=false;break;}
        kind='day_trip';travelMinutes=Math.max(travelMinutes,trip.oneWayMinutes*2);
      }
      // For unverified remote routes, graph time is only a provisional estimate.
      // A fully confirmed single-stop remote route already includes both legs.
      if(!transport.hasUnverified&&(card.items||[]).length===1&&transport.extraMinutes>0&&travelMinutes>0)travelMinutes=0;
      const required=sceneMinutes+travelMinutes;
      if(required>day.availableMinutes)eligible=false;
      return eligible?{day,required,kind,travelMinutes,transport}:null;
    }).filter(Boolean).sort((a,b)=>(a.day.usedMinutes+a.required)-(b.day.usedMinutes+b.required)||a.day.score-b.day.score);
    if(!candidates.length)continue;
    const pick=candidates[0];pick.day.cards.push({...card,travelKind:pick.kind,travelMinutes:pick.travelMinutes,transportWarnings:pick.transport.warnings,transportExtraMinutes:pick.transport.extraMinutes});pick.day.usedMinutes+=pick.required;pick.day.score+=card.score;
  }
  return days;
}


// Date-aware solar timing and per-scene visit suggestions.
// buildUndatedCards above remains the only geographic scene packer.
/**
 * Travelite scene timing engine.
 * Pure functions: no Supabase calls, no DOM and no hard-coded destinations.
 * The caller supplies selected POIs, their time_windows, opening hours and trip dates.
 * All clock times are LOCAL to the POI. Solar times use POI coordinates and date.
 */
const RAD=Math.PI/180;
const DAY=86400000;
const pad=n=>String(n).padStart(2,'0');
const mins=t=>{if(!t)return null;const m=String(t).match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
const hhmm=m=>{const v=((Math.round(m)%1440)+1440)%1440;return pad(Math.floor(v/60))+':'+pad(v%60);};
const coord=p=>({lat:Number(p.latitude??p.lat),lon:Number(p.longitude??p.lng)});
const valid=p=>{const c=coord(p);return p!=null&&p.latitude!=null&&p.longitude!=null&&Number.isFinite(c.lat)&&Number.isFinite(c.lon)&&Math.abs(c.lat)<=90&&Math.abs(c.lon)<=180;};


/** NOAA-style solar calculation; returns UTC Date, or null during polar day/night. */
export function solarEvent(date,latitude,longitude,event='sunset'){
  const d=String(date).slice(0,10),day=new Date(d+'T00:00:00Z');
  if(!Number.isFinite(day.getTime())||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude)))return null;
  const N=Math.floor((day-Date.UTC(day.getUTCFullYear(),0,0))/DAY);
  const lngHour=Number(longitude)/15,setting=event==='sunset';
  const t=N+((setting?18:6)-lngHour)/24;
  const M=0.9856*t-3.289;
  const L=((M+1.916*Math.sin(M*RAD)+0.020*Math.sin(2*M*RAD)+282.634)%360+360)%360;
  let RA=((Math.atan(0.91764*Math.tan(L*RAD))/RAD)%360+360)%360;
  RA+=(Math.floor(L/90)*90-Math.floor(RA/90)*90);RA/=15;
  const sinDec=0.39782*Math.sin(L*RAD),cosDec=Math.cos(Math.asin(sinDec));
  const cosH=(Math.cos(90.833*RAD)-sinDec*Math.sin(Number(latitude)*RAD))/(cosDec*Math.cos(Number(latitude)*RAD));
  if(cosH>1||cosH< -1)return null;
  const H=(setting?360-Math.acos(cosH)/RAD:Math.acos(cosH)/RAD)/15;
  const T=H+RA-0.06571*t-6.622;
  const utcHours=T-lngHour;
  return new Date(day.getTime()+utcHours*3600000);
}
export function solarLocalMinutes(date,place,kind='sunset',timeZone='Asia/Tokyo'){
  if(!valid(place))return null;
  const c=coord(place),instant=solarEvent(date,c.lat,c.lon,kind);
  if(!instant)return null;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const get=k=>Number(parts.find(p=>p.type===k)?.value);
  return get('hour')*60+get('minute');
}
function windows(place,date,timeZone){
  const result=[];
  for(const w of (place.time_windows||place.place_time_windows||[])){
    let start,end;
    if(w.window_kind==='clock'){start=mins(w.start_time);end=mins(w.end_time);}
    else if(['sunrise','sunset'].includes(w.window_kind)){
      const anchor=solarLocalMinutes(date,place,w.window_kind,timeZone);
      if(anchor==null)continue;
      start=anchor+Number(w.start_offset_min||0);end=anchor+Number(w.end_offset_min||0);
    }else continue; // opening/closing anchors require verified structured hours
    if(start==null||end==null)continue;
    result.push({label:w.label||w.window_kind,kind:w.window_kind,start,end,strength:w.strength||'preferred',priority:Number(w.priority??50),experienceScore:clamp(Number(w.experience_score??70),0,100),crowdScore:clamp(Number(w.crowd_score??50),0,100)});
  }
  return result;
}
/**
 * Resolve structured access hours into planner intervals.
 * Priority:
 *  1. caller resolver (for date/holiday-specific logic)
 *  2. verified_hours normalized arrays
 *  3. places.opening_hours JSON
 *
 * opening_hours may contain a main interval under "regular" plus named sub-facilities
 * such as "food_court" or "factory". A POI can request one with
 * place.visit_context / place.access_context / place.subfacility.
 * The main place never inherits a sub-facility's earlier closing time.
 */
// Read the existing Supabase opening_hours format without treating provisional
// or holiday-dependent entries as guaranteed live venue availability.
export function resolvePlaceHours(place,date){
 const h=place?.opening_hours;
 if(!h||typeof h!=='object')return null;
 if(h.open_access===true||h.access==='24_hours')return [{open:'00:00',close:'24:00',source:'open_access'}];
 const d=new Date(String(date).slice(0,10)+'T12:00:00Z');
 if(!Number.isFinite(d.getTime()))return null;
 const month=d.getUTCMonth()+1;
 const monthInRange=(range)=>{
  const names={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const parts=String(range||'').toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})/g)||[];
  const values=parts.slice(0,2).map(x=>names[x]||Number(x));
  if(values.length<2)return false;
  return values[0]<=values[1]?month>=values[0]&&month<=values[1]:month>=values[0]||month<=values[1];
 };
 const closed=String(h.closed||'').toLowerCase();
 const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 // Holiday exceptions and irregular closures still require user confirmation.
 if(weekdays.some((w,i)=>i===d.getUTCDay()&&new RegExp('\\b'+w+'\\b').test(closed)))return [];
 if(/dec\s*29\s*[-–]\s*jan\s*3/i.test(closed)&&((month===12&&d.getUTCDate()>=29)||(month===1&&d.getUTCDate()<=3)))return [];
 const context=String(place.visit_context||place.access_context||place.subfacility||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
 const selected=(context&&h[context])||h.seasonal?.find(x=>monthInRange(x.months))||h.regular||h.main||h.general;
 if(!selected)return null;
 const normalizeInterval=(x)=>{
  if(!x||typeof x!=='object')return x;
  const open=x.open??x.start??x.gate_open??x.business_open;
  let close=x.close??x.end??x.gate_close??x.business_close;
  const lastAdmission=x.last_admission??x.lastAdmission;
  // Some official records publish reception/last-admission rather than a separate
  // closing time. Keep that usable as the conservative access boundary.
  if(close==null&&lastAdmission!=null)close=lastAdmission;
  return {...x,open,close,last_admission:lastAdmission};
 };
 return (Array.isArray(selected)?selected:[selected]).map(normalizeInterval);
}
function openIntervals(place,date,resolveHours){
 let raw=typeof resolveHours==='function'?resolveHours(place,date):null;
 if(raw==null)raw=place.verified_hours;
 if(raw==null)raw=resolvePlaceHours(place,date);
 if(raw===null)return null;
 if(!Array.isArray(raw))raw=[raw];
 if(!raw.length)return [];
 return raw.map(x=>({
  start:mins(x.open??x.start),end:mins(x.close??x.end),
  lastAdmission:mins(x.last_admission??x.lastAdmission),
  source:x.source||place.opening_hours?.status||'structured_hours'
 })).filter(x=>x.start!=null&&x.end!=null).map(x=>{
  const end=x.end<=x.start?x.end+1440:x.end;
  // Last admission constrains entry, not the end of the visit.
  return {...x,end};
 });
}

const preferenceMode=v=>{const x=norm(v);return x==='avoid'||x==='avoid_crowds'?'avoid':x==='timing'||x==='best_time'||x==='best_time_windows'?'timing':'balanced';};
function windowScore(w,crowdPreference='balanced'){
  const mode=preferenceMode(crowdPreference);
  const strength={ideal:100,strong:82,preferred:62,acceptable:42,avoid:0}[norm(w.strength)]??55;
  const experience=clamp(Number(w.experienceScore??70),0,100);
  const quiet=100-clamp(Number(w.crowdScore??50),0,100);
  const priority=clamp(Number(w.priority??50),0,100);
  const weights=mode==='avoid'?{experience:.25,quiet:.55,strength:.20}:mode==='timing'?{experience:.60,quiet:.10,strength:.30}:{experience:.40,quiet:.30,strength:.30};
  let score=experience*weights.experience+quiet*weights.quiet+strength*weights.strength;
  score+=(priority-50)*0.08;
  if(norm(w.strength)==='avoid')score-=45;
  return score;
}
function fitPlace(place,date,{timeZone='Asia/Tokyo',resolveHours,dayStart=480,dayEnd=1260,crowdPreference='balanced'}={}){
  const duration=clamp(Number(place.estimated_minutes_max||place.estimated_minutes_min||60),15,360);
  const prefs=windows(place,date,timeZone);
  const opening=openIntervals(place,date,resolveHours);
  const feasible=(opening??[{start:dayStart,end:dayEnd}]).map(x=>({start:Math.max(dayStart,x.start),end:Math.min(dayEnd,x.end),lastAdmission:x.lastAdmission})).filter(x=>x.end-x.start>=duration);
  if(!feasible.length)return {place,scheduled:false,reason:'outside_opening_hours'};
  const candidates=[];
  for(const span of feasible){
    for(let t=span.start;t+duration<=span.end&&(span.lastAdmission==null||t<=span.lastAdmission);t+=15){
      const midpoint=t+duration/2;
      let bonus=0,matched=null;
      for(const p of prefs){
        if(midpoint>=p.start&&midpoint<=p.end){
          const value=windowScore(p,crowdPreference);
          if(value>bonus){bonus=value;matched=p;}
        }
      }
      candidates.push({start:t,end:t+duration,bonus,matched});
    }
  }
  candidates.sort((a,b)=>b.bonus-a.bonus||a.start-b.start);
  return {place,scheduled:true,candidates:candidates.slice(0,32),preferences:prefs,openingVerified:!!opening&&place.opening_hours?.verified!==false&&place.opening_hours?.status!=='provisional'};
}
/**
 * Schedules one geographically coherent scene for one date.
 * Travel estimates are deliberately injectable; without a routing API a conservative
 * walking estimate is used and flagged as estimated.
 */
export function scheduleScene(items,date,{timeZone='Asia/Tokyo',resolveHours,travelMinutes,dayStart=480,dayEnd=1260,crowdPreference='balanced'}={}){
  const pending=items.map(p=>fitPlace(p,date,{timeZone,resolveHours,dayStart,dayEnd,crowdPreference}));
  const scheduled=[],unplaced=[];
  const estimate=(a,b)=>{if(travelMinutes){const n=travelMinutes(a,b);if(Number.isFinite(n))return n;}const km=distanceKm(a,b);return km==null?30:Math.ceil((km/4.2*60+8)/5)*5;};
  while(pending.length){
    let best=null;
    for(let i=0;i<pending.length;i++){
      const item=pending[i];
      if(!item.scheduled)continue;
      for(const c of item.candidates){
        let ok=true,travel=0;
        for(const existing of scheduled){
          const between=estimate(existing.place,item.place);
          if(c.start>=existing.end){if(c.start<existing.end+between){ok=false;break;}travel=Math.max(travel,between);}
          else if(existing.start>=c.end){if(existing.start<c.end+between){ok=false;break;}travel=Math.max(travel,between);}
          else {ok=false;break;}
        }
        if(!ok)continue;
        // Preference quality chooses the time; travel is the tie-breaker/scene cost.
        const score=c.bonus-(travel/10)+(scheduled.length?0:-c.start/1000);
        if(!best||score>best.score)best={i,c,score};
      }
    }
    if(!best)break;
    const chosen=pending.splice(best.i,1)[0];
    scheduled.push({place:chosen.place,start:best.c.start,end:best.c.end,arrival:hhmm(best.c.start),departure:hhmm(best.c.end),matchedPreference:best.c.matched,preferenceScore:Math.round(best.c.bonus),crowdPreference:preferenceMode(crowdPreference),openingVerified:chosen.openingVerified});
  }
  for(const item of pending)unplaced.push({place:item.place,reason:item.reason||'no_feasible_slot'});
  scheduled.sort((a,b)=>a.start-b.start);
  return {date,scheduled,unplaced,estimatedTravel:!travelMinutes,sunrise:scheduled.length?solarLocalMinutes(date,scheduled[0].place,'sunrise',timeZone):null,sunset:scheduled.length?solarLocalMinutes(date,scheduled[0].place,'sunset',timeZone):null};
}
