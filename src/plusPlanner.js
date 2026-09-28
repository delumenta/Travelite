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
