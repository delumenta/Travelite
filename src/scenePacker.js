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
const valid=p=>{const c=coord(p);return Number.isFinite(c.lat)&&Number.isFinite(c.lon)&&Math.abs(c.lat)<=90&&Math.abs(c.lon)<=180;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function distanceKm(a,b){if(!valid(a)||!valid(b))return null;const A=coord(a),B=coord(b),dlat=(B.lat-A.lat)*RAD,dlon=(B.lon-A.lon)*RAD;return 12742*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(A.lat*RAD)*Math.cos(B.lat*RAD)*Math.sin(dlon/2)**2));}

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
    result.push({label:w.label||w.window_kind,kind:w.window_kind,start,end,strength:w.strength||'preferred',priority:Number(w.priority||50)});
  }
  return result;
}
/** Accepts optional normalized [{open:'09:00',close:'18:00'}] or a caller-provided resolver. */
function openIntervals(place,date,resolveHours){
  const raw=typeof resolveHours==='function'?resolveHours(place,date):place.verified_hours;
  if(!Array.isArray(raw)||!raw.length)return null;
  return raw.map(x=>({start:mins(x.open??x.start),end:mins(x.close??x.end)})).filter(x=>x.start!=null&&x.end!=null).map(x=>({...x,end:x.end<=x.start?x.end+1440:x.end}));
}
function fitPlace(place,date,{timeZone='Asia/Tokyo',resolveHours,dayStart=480,dayEnd=1260}={}){
  const duration=clamp(Number(place.estimated_minutes_max||place.estimated_minutes_min||60),15,360);
  const prefs=windows(place,date,timeZone);
  const opening=openIntervals(place,date,resolveHours);
  const feasible=(opening||[{start:dayStart,end:dayEnd}]).map(x=>({start:Math.max(dayStart,x.start),end:Math.min(dayEnd,x.end)})).filter(x=>x.end-x.start>=duration);
  if(!feasible.length)return {place,scheduled:false,reason:'outside_opening_hours'};
  const candidates=[];
  for(const span of feasible){
    for(let t=span.start;t+duration<=span.end;t+=15){
      const midpoint=t+duration/2;
      let bonus=0,matched=null;
      for(const p of prefs){
        if(midpoint>=p.start&&midpoint<=p.end){
          const strength={ideal:35,strong:24,preferred:12,acceptable:5,avoid:-30}[p.strength]??10;
          const value=strength+(100-p.priority)/25;
          if(value>bonus){bonus=value;matched=p;}
        }
      }
      candidates.push({start:t,end:t+duration,bonus,matched});
    }
  }
  candidates.sort((a,b)=>b.bonus-a.bonus||a.start-b.start);
  return {place,scheduled:true,candidates:candidates.slice(0,32),preferences:prefs,openingVerified:!!opening};
}
/**
 * Schedules one geographically coherent scene for one date.
 * Travel estimates are deliberately injectable; without a routing API a conservative
 * walking estimate is used and flagged as estimated.
 */
export function scheduleScene(items,date,{timeZone='Asia/Tokyo',resolveHours,travelMinutes,dayStart=480,dayEnd=1260}={}){
  const pending=items.map(p=>fitPlace(p,date,{timeZone,resolveHours,dayStart,dayEnd}));
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
        const score=c.bonus-(travel/10)+(scheduled.length?0:-c.start/1000);
        if(!best||score>best.score)best={i,c,score};
      }
    }
    if(!best)break;
    const chosen=pending.splice(best.i,1)[0];
    scheduled.push({place:chosen.place,start:best.c.start,end:best.c.end,arrival:hhmm(best.c.start),departure:hhmm(best.c.end),matchedPreference:best.c.matched,openingVerified:chosen.openingVerified});
  }
  for(const item of pending)unplaced.push({place:item.place,reason:item.reason||'no_feasible_slot'});
  scheduled.sort((a,b)=>a.start-b.start);
  return {date,scheduled,unplaced,estimatedTravel:!travelMinutes,sunrise:scheduled.length?solarLocalMinutes(date,scheduled[0].place,'sunrise',timeZone):null,sunset:scheduled.length?solarLocalMinutes(date,scheduled[0].place,'sunset',timeZone):null};
}
/** Undated geographic scene builder; input order never forces dates. */
export function packScenes(selected,{maxRadiusKm=2.5,maxStops=5}={}){
  const remaining=[...selected],scenes=[];
  while(remaining.length){
    const seed=remaining.shift(),items=[seed];
    while(items.length<maxStops){
      let best=-1,shortest=Infinity;
      remaining.forEach((p,i)=>{
        if(seed.city&&p.city&&seed.city!==p.city)return;
        if(seed.region&&p.region&&seed.region!==p.region)return;
        const d=Math.max(...items.map(x=>distanceKm(x,p)??Infinity));
        if(d<=maxRadiusKm&&d<shortest){shortest=d;best=i;}
      });
      if(best<0)break;
      items.push(remaining.splice(best,1)[0]);
    }
    scenes.push({id:'scene-'+scenes.length,items,region:seed.region||null,city:seed.city||null});
  }
  return scenes;
}
