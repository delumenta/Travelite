// Travelite cache-bust build 2026-09-26-1714
import { createClient } from '@supabase/supabase-js';
import { createIcons, Compass, House, CalendarDays, Heart, Menu, Plus, ArrowRight, ArrowLeft, ArrowUpRight, MapPin, Clock3, Sparkles, Bookmark, Utensils, Ticket, Wallet, Search, ChevronDown, ChevronLeft, ChevronRight, X, Check, Trash2, Send, Navigation, LogOut, LoaderCircle, LockKeyhole, Mail, Plane, TrainFront, BedDouble, CircleHelp, SlidersHorizontal, ExternalLink, GripVertical, Pencil, Globe2, Leaf, Coffee, Route, CalendarPlus, CheckCircle2, MoreHorizontal, MessageCircle, Map, Copy, Sunrise, Sunset, ListFilter, UserRound, Sun, Moon } from 'lucide';
import './style.css';

const SB_URL = 'https://zngncasvdrrxyrkjqutj.supabase.co';
const SB_KEY = 'sb_publishable_wUrH6t12z4tRKruS28LqWQ_2GG06U9m';
const sb = createClient(SB_URL, SB_KEY, { auth: { detectSessionInUrl: true, flowType: 'pkce' } });
const GOOGLE_MAPS_BROWSER_KEY = "AIzaSyD1tFdxoch8ihGkoLA7OYoEuG2k93CGi80";
let googleMapsPromise=null;
let googlePlacesPromise=null;

function loadGoogleMapsBrowser(){
  if(window.google?.maps?.importLibrary)return Promise.resolve(window.google.maps);
  if(googleMapsPromise)return googleMapsPromise;
  googleMapsPromise=new Promise((resolve,reject)=>{
    const callbackName='__traveliteGoogleMapsReady';
    window[callbackName]=()=>{
      if(window.google?.maps?.importLibrary)resolve(window.google.maps);
      else { googleMapsPromise=null; reject(new Error('Google Maps loaded but Places is unavailable.')); }
    };
    const script=document.createElement('script');
    script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(GOOGLE_MAPS_BROWSER_KEY)+'&v=weekly&loading=async&callback='+callbackName;
    script.async=true;
    script.onerror=()=>{googleMapsPromise=null;reject(new Error('Google Maps could not load.'));};
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

function getGooglePlacesBrowser(){
  if(googlePlacesPromise)return googlePlacesPromise;
  googlePlacesPromise=(async()=>{
    await loadGoogleMapsBrowser();
    const lib=await google.maps.importLibrary('places');
    if(!lib?.Place){ googlePlacesPromise=null; throw new Error('Google Places is unavailable.'); }
    return lib;
  })();
  return googlePlacesPromise;
}

function googleLatLng(place){
  const loc=place?.location;
  if(!loc)return {latitude:null,longitude:null};
  const latitude=typeof loc.lat==='function'?loc.lat():loc.lat;
  const longitude=typeof loc.lng==='function'?loc.lng():loc.lng;
  return {latitude:Number.isFinite(Number(latitude))?Number(latitude):null,longitude:Number.isFinite(Number(longitude))?Number(longitude):null};
}

function normalizeBrowserPlace(place,kind='place'){
  const {latitude,longitude}=googleLatLng(place);
  const primaryType=place.primaryType||place.types?.[0]||(kind==='food'?'restaurant':'attraction');
  return {
    name:typeof place.displayName==='string'?place.displayName:(place.displayName?.text||''),
    provider:'google',
    provider_place_id:place.id||'',
    address:place.formattedAddress||'',
    latitude,
    longitude,
    maps_url:place.googleMapsURI||place.googleMapsUri||'',
    place_type:primaryType,
    cuisine:kind==='food'?primaryType:null,
    result_kind:kind
  };
}

async function browserNearbyPlaces({latitude,longitude,radius=1500,kind='place'}){
  const {Place,SearchNearbyRankPreference}=await getGooglePlacesBrowser();
  const fields=['id','displayName','formattedAddress','location','types','primaryType','googleMapsURI'];
  const request={
    fields,
    locationRestriction:{center:{lat:Number(latitude),lng:Number(longitude)},radius:Number(radius)},
    maxResultCount:20,
    rankPreference:kind==='food'
      ? (SearchNearbyRankPreference?.DISTANCE||'DISTANCE')
      : (SearchNearbyRankPreference?.POPULARITY||'POPULARITY'),
  };
  if(kind==='food')request.includedPrimaryTypes=['restaurant','cafe','bakery'];
  const response=await Place.searchNearby(request);
  return (response?.places||[]).map(p=>normalizeBrowserPlace(p,kind)).filter(p=>p.name&&p.latitude!=null&&p.longitude!=null);
}


async function browserTextPlaces(query,kind='place',maxResultCount=10){
  const {Place}=await getGooglePlacesBrowser();
  const response=await Place.searchByText({
    textQuery:String(query||'').trim(),
    fields:['id','displayName','formattedAddress','location','types','primaryType','googleMapsURI'],
    maxResultCount:Math.max(1,Math.min(Number(maxResultCount)||10,20))
  });
  return (response?.places||[])
    .map(p=>normalizeBrowserPlace(p,kind))
    .filter(p=>p.name&&p.latitude!=null&&p.longitude!=null);
}

const icons = { Compass, House, CalendarDays, Heart, Menu, Plus, ArrowRight, ArrowLeft, ArrowUpRight, MapPin, Clock3, Sparkles, Bookmark, Utensils, Ticket, Wallet, Search, ChevronDown, ChevronLeft, ChevronRight, X, Check, Trash2, Send, Navigation, LogOut, LoaderCircle, LockKeyhole, Mail, Plane, TrainFront, BedDouble, CircleHelp, SlidersHorizontal, ExternalLink, GripVertical, Pencil, Globe2, Leaf, Coffee, Route, CalendarPlus, CheckCircle2, MoreHorizontal, MessageCircle, Map, Copy, Sunrise, Sunset, ListFilter, UserRound, Sun, Moon };
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls='') => `<i data-lucide="${name}" class="${cls}"></i>`;
const fmtDate = (d, opts={day:'numeric',month:'short'}) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-SG',opts) : '';
const fmtDay = d => fmtDate(d,{weekday:'short',day:'numeric',month:'short'});
const dateRange = (a,b) => a ? `${fmtDate(a)}${b && b!==a ? ` – ${fmtDate(b,{day:'numeric',month:'short',year:'numeric'})}` : ''}` : 'Dates to be decided';
const daysBetween = (a,b) => a && b ? Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000)+1 : 0;
const dayList = (trip) => { if (!trip?.start_date || !trip?.end_date) return []; const n=Math.min(Math.max(daysBetween(trip.start_date,trip.end_date),0),90); return Array.from({length:n},(_,i)=>{ const d=new Date(`${trip.start_date}T12:00:00`); d.setDate(d.getDate()+i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }); };
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const time = t => t ? String(t).slice(0,5) : '';
const placePhotoIsStored = place => typeof place?.image_url === 'string' && place.image_url.startsWith(`${SB_URL}/storage/v1/object/public/place-photos/`);
const maps = row => { const u=row?.maps_url; if (u && /^https:\/\//i.test(u)) return u; if (row?.latitude != null && row?.longitude != null) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.latitude},${row.longitude}`)}`; return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row?.address || row?.location_name || row?.name || row?.title || '')}`; };
const directions = row => { const destination=(row?.latitude!=null&&row?.longitude!=null)?`${row.latitude},${row.longitude}`:(row?.address||row?.location_name||row?.name||''); if(!destination)return maps(row); return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`; };
const destinationScript = trip => { const country=(trip?.country||'').toLowerCase(); if(country.includes('japan')||country.includes('日本'))return {word:'日本',label:'JAPAN',lang:'ja'}; if(country.includes('china')||country.includes('中国'))return {word:'中国',label:'CHINA',lang:'zh'}; if(country.includes('korea')||country.includes('한국')||country.includes('대한민국'))return {word:'한국',label:'KOREA',lang:'ko'}; return null; };
const countryKey = country => String(country||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
const countryAliases = {korea:'southkorea',republicofkorea:'southkorea',uk:'unitedkingdom',greatbritain:'unitedkingdom',britain:'unitedkingdom',england:'unitedkingdom',usa:'unitedstates',us:'unitedstates',america:'unitedstates'};
const canonicalCountry = value => { const key=countryKey(value).replace(/[^\p{L}\p{N}]/gu,'');return countryAliases[key]||key; };
const inTripCountry = row => { const destination=canonicalCountry(state.trip?.country);return !destination || canonicalCountry(row.country)===destination; };
const cover = trip => { if (trip?.cover_image_url && /^https:\/\//.test(trip.cover_image_url)) return trip.cover_image_url; const saved=state.countryPhotos[countryKey(trip?.country)]; if(saved?.image_url)return saved.image_url; const destination=`${trip?.country||''} ${trip?.name||''}`.toLowerCase(); const images=[[/\b(italy|italia|rome|roma|venice|venezia|florence|firenze|milan|milano|cinque terre)\b/,'photo-1459085184239-463574c08a08'],[/japan|日本|tokyo|kyoto|osaka/i,'photo-1493976040374-85c8e12f0c0e'],[/taiwan|臺灣|台湾|taipei/i,'photo-1470004914212-05527e49370b']]; const image=images.find(([pattern])=>pattern.test(destination))?.[1]||'photo-1488646953014-85cb44e25828'; return `https://images.unsplash.com/${image}?w=1400&q=85`; };
const coverCredit = trip => { if(trip?.cover_image_url)return '';const p=state.countryPhotos[countryKey(trip?.country)];return p?.source_page?.startsWith('https://commons.wikimedia.org/')?`<a class="hero-photo-credit" href="${esc(p.source_page)}" target="_blank" rel="noopener noreferrer">Photo: ${esc(p.author)} · ${esc(p.license)}</a>`:''; };
const toast = (msg, error=false) => { let el=$('#toast'); if (!el) {el=document.createElement('div');el.id='toast';document.body.appendChild(el)} el.textContent=msg;el.className=error?'show error':'show';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='',4000); };
const state = {user:null,trips:[],trip:null,tab:'home',day:null,schedule:[],bookings:[],expenses:[],places:[],restaurants:[],savedPlaces:[],savedFood:[],search:'',kind:'all',savedKind:'all',modal:null,authMode:'login',loading:true,assistant:[],threadId:null,assistantBusy:false,assistantOpen:false,mobileMenu:false,nearbyFood:[],foodBusy:false,foodLocation:null,foodError:'',foodMode:'collection',foodFilter:'all',foodTab:'mine',foodCity:'',foodArea:'',foodCuisine:'',foodSearch:'',scheduleExpanded:false,theme:localStorage.getItem('travelite.theme')==='dark'?'dark':'light',googleResults:[],catalogSelection:null,googleBusy:false,countryPhotos:{},addSearch:'',addKind:'all',addSelection:null,addNearby:false,aroundStop:null,aroundResults:[],aroundBusy:false,aroundRadius:2000,discoveryMode:null,discoveryTitle:'',discoverySubtitle:'',starterCity:''};
document.documentElement.dataset.theme=state.theme;
function drawIcons(){ createIcons({icons,attrs:{'stroke-width':1.85}}); }
function render(){ document.documentElement.dataset.theme=state.theme; $('#app').innerHTML = !state.user ? authView() : shell(); drawIcons(); if(state.tab==='explore'||state.tab==='saved'||state.modal?.type==='addToDay')hydratePlacePhotos(); if(state.assistantOpen) { const el=$('.chat-messages'); if(el)el.scrollTop=el.scrollHeight; } }
function authView(){ return `<div class="auth-shell"><div class="auth-photo"><div class="auth-photo-shade"></div><div class="auth-photo-content"><div class="brand brand-light">${icon('Compass')}<span>travelite<span class="brand-dot">.</span></span></div><div class="auth-quote">Make room for<br><em>the unexpected.</em></div><p>All your places, plans, and little discoveries, in one beautiful place.</p><div class="auth-photo-foot">A better way to go somewhere.</div></div></div><div class="auth-side"><button class="theme-toggle auth-theme" data-action="toggle-theme" aria-label="Switch theme">${icon(state.theme==='dark'?'Sun':'Moon')}<span>${state.theme==='dark'?'Light':'Dark'} mode</span></button><div class="auth-mobile-brand brand">${icon('Compass')}<span>travelite<span class="brand-dot">.</span></span></div><div class="auth-card"><div class="eyebrow">YOUR NEXT STORY STARTS HERE</div><h1>${state.authMode==='signup'?'A world of plans awaits.':state.authMode==='reset'?'Reset your password.':'Welcome back.'}</h1><p class="subline">${state.authMode==='signup'?'Create your account and start collecting the places that move you.':state.authMode==='reset'?'We’ll send you a link to choose a new password.':'Pick up right where your wanderlust left off.'}</p><form id="auth-form">${state.authMode!=='reset'?`<label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label><label>Password<input name="password" type="password" autocomplete="${state.authMode==='signup'?'new-password':'current-password'}" minlength="6" placeholder="At least 6 characters" required></label>`:`<label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>`}<button class="btn primary full" type="submit">${state.authMode==='signup'?'Create account':state.authMode==='reset'?'Send reset link':'Sign in'} ${icon('ArrowRight')}</button></form><div class="auth-switch">${state.authMode==='login'?`New to Travelite? <button data-action="auth-mode" data-value="signup">Create an account</button><br><button class="forgot" data-action="auth-mode" data-value="reset">Forgot your password?</button>`:`Already have an account? <button data-action="auth-mode" data-value="login">Sign in</button>`}</div></div><div class="auth-footer">Travel more. Carry less. © ${new Date().getFullYear()} Travelite</div></div></div>`; }
const nav = [['home','House','Home'],['plan','Route','Plan'],['explore','Compass','Explore'],['saved','Heart','Saved'],['bookings','Ticket','Bookings'],['expenses','Wallet','Expenses']];
function shell(){ const trip=state.trip; return `<div class="app-shell"><aside class="sidebar"><div class="brand">${icon('Compass')}<span>travelite<span class="brand-dot">.</span></span></div><div class="side-label">YOUR SPACE</div><button class="trip-switch" data-action="trip-picker">${icon('Globe2')}<span><b>${esc(trip?.name||'All trips')}</b><small>${esc(trip?.country||'Your adventures')}</small></span>${icon('ChevronDown')}</button><div class="side-label side-label-nav">THE JOURNEY</div><nav>${nav.map(([id,ic,label])=>`<button class="nav-link ${state.tab===id?'active':''}" data-action="tab" data-value="${id}">${icon(ic)}<span>${label}</span>${id==='bookings'&&state.bookings.length?`<small>${state.bookings.length}</small>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><button class="assist-side" data-action="assistant">${icon('Sparkles')}<span><b>Travel Assist</b><small>Your companion on the road</small></span>${icon('ArrowUpRight')}</button></div></aside><div class="main-wrap"><header class="topbar"><div class="mobile-logo brand">${icon('Compass')}<span>travelite<span class="brand-dot">.</span></span></div><div class="desktop-breadcrumb">YOUR TRIPS <span>/</span> ${esc(trip?.name||'Overview')} <span>/</span> ${esc(nav.find(n=>n[0]===state.tab)?.[2]||'Overview')}</div><div class="top-actions"><button class="theme-toggle" data-action="toggle-theme" aria-label="Switch theme">${icon(state.theme==='dark'?'Sun':'Moon')}<span>${state.theme==='dark'?'Light':'Dark'} mode</span></button><button class="top-avatar" data-action="profile" aria-label="Account">${esc((state.user?.email||'T')[0].toUpperCase())}</button><button class="header-menu" data-action="menu" aria-label="Open full menu" aria-expanded="${state.mobileMenu}">${icon('Menu')}</button></div></header><main class="content">${state.loading?`<div class="loading">${icon('LoaderCircle','spin')}<p>Finding your journey…</p></div>`:!trip?emptyTrips():body()}</main></div><nav class="bottom-nav">${[['home','House','Home'],['plan','Route','Plan'],['explore','Compass','Explore'],['saved','Heart','Saved']].map(([id,ic,label])=>`<button data-action="tab" data-value="${id}" class="${state.tab===id?'active':''}">${icon(ic)}<span>${label}</span></button>`).join('')}<button data-action="menu" class="${['bookings','expenses'].includes(state.tab)?'active':''}">${icon('Menu')}<span>More</span></button></nav>${state.mobileMenu?`<div class="overlay" data-action="close-menu"><div class="mobile-menu" role="dialog" aria-modal="true" aria-label="Travelite menu" ><div class="modal-head"><div><div class="eyebrow">TRAVELITE</div><h2>Menu</h2></div><button data-action="close-menu" class="icon-btn" aria-label="Close menu">${icon('X')}</button></div><button class="menu-trip" data-action="trip-picker">${icon('Globe2')}<span><b>${esc(trip?.name||'Choose a trip')}</b><small>${esc(trip?.country||'Your adventures')}</small></span>${icon('ChevronDown')}</button><div class="menu-label">YOUR JOURNEY</div>${nav.map(([id,ic,label])=>`<button data-action="tab" data-value="${id}" class="${state.tab===id?'active':''}">${icon(ic)}<span>${label}</span>${icon('ArrowRight')}</button>`).join('')}<div class="menu-label">TOOLS & ACCOUNT</div><button data-action="assistant">${icon('Sparkles')} Travel Assist ${icon('ArrowRight')}</button><button data-action="photo-review">${icon('CheckCircle2')} Photo review ${icon('ArrowRight')}</button><button data-action="toggle-theme">${icon(state.theme==='dark'?'Sun':'Moon')} ${state.theme==='dark'?'Light':'Dark'} mode ${icon('ArrowRight')}</button><button data-action="profile">${icon('UserRound')} Account ${icon('ArrowRight')}</button></div></div>`:''}${state.modal?modalView():''}${state.assistantOpen?assistantView():''}<button class="floating-assist" data-action="assistant" aria-label="Open Travel Assist">${icon('Sparkles')}</button></div>`; }
function body(){return ({home:homeView,plan:planView,food:foodView,explore:exploreView,saved:savedView,bookings:bookingsView,expenses:expensesView}[state.tab]||homeView)();}
function title(kicker,heading,desc,action){return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${heading}</h1><p>${desc}</p></div>${action||''}</div>`;}
function emptyTrips(){return `<div class="first-trip"><div class="first-trip-art">${icon('Compass')}</div><div class="eyebrow">A NEW CHAPTER</div><h1>Where to next?</h1><p>Begin with a destination. We’ll help you gather the rest along the way.</p><button class="btn primary" data-action="new-trip">${icon('Plus')} Create your first trip</button></div>`;}
function homeView(){let t=state.trip,dates=dayList(t),now=today(),current=dates.includes(now)?now:(dates.find(d=>d>=now)||dates[0]);let dayStops=state.schedule.filter(x=>x.schedule_date===current).sort((a,b)=>(time(a.start_time)||'99:99').localeCompare(time(b.start_time)||'99:99')||(a.sort_order||0)-(b.sort_order||0)),items=dayStops.slice(0,3),countdown=t.start_date?Math.ceil((new Date(`${t.start_date}T12:00:00`)-new Date(`${now}T12:00:00`))/86400000):null;return `<div class="home-page"><div class="greeting"><div><div class="eyebrow">YOUR JOURNEY, BEAUTIFULLY TOGETHER</div><h1>Let’s go places<span class="accent-period">.</span></h1><p>Everything you need for the road ahead, right here.</p></div></div><div class="hero" style="background-image:linear-gradient(90deg,rgba(26,16,20,.86),rgba(31,16,22,.22)),url('${esc(cover(t))}')"><div class="hero-content"><div class="hero-label">${icon('MapPin')} ${esc(t.country||'YOUR DESTINATION')}</div><h2>${esc(t.name)}</h2><div class="hero-date">${icon('CalendarDays')} ${esc(dateRange(t.start_date,t.end_date))}</div><button class="btn cream" data-action="tab" data-value="plan">View itinerary ${icon('ArrowRight')}</button></div>${destinationScript(t)?`<div class="hero-watermark" aria-hidden="true" lang="${destinationScript(t).lang}"><span>${destinationScript(t).word}</span><small>${destinationScript(t).label}</small></div>`:''}<div class="hero-count"><strong>${countdown==null?'—':countdown>0?countdown:countdown===0?'Now':'✓'}</strong><span>${countdown>0?'DAYS TO GO':countdown===0?'STARTS TODAY':countdown<0?'MEMORIES MADE':'READY TO PLAN'}</span></div>${coverCredit(t)}</div><div class="home-stats"><button data-action="tab" data-value="plan">${icon('Route')}<b>${state.schedule.length}</b><span>Planned stops</span>${icon('ArrowUpRight')}</button><button data-action="tab" data-value="saved">${icon('Heart')}<b>${state.savedPlaces.length+state.savedFood.length}</b><span>Saved ideas</span>${icon('ArrowUpRight')}</button><button data-action="tab" data-value="bookings">${icon('Ticket')}<b>${state.bookings.length}</b><span>Bookings</span>${icon('ArrowUpRight')}</button></div><div class="home-grid"><section class="panel next-panel"><div class="section-head"><div><div class="eyebrow">COMING UP</div><h2>${current===now?'Today’s plan':current?'Your next day':'Start planning'}</h2></div><button class="text-link" data-action="toggle-schedule" aria-expanded="${state.scheduleExpanded}">${state.scheduleExpanded?'Hide full schedule':'View full schedule'} ${icon('ChevronDown')}</button></div>${state.scheduleExpanded?'':items.length?items.map((x,i)=>`<div class="next-item"><span class="next-time">${time(x.start_time)||String(i+1).padStart(2,'0')}</span><span class="next-dot"></span><div><b>${esc(x.title)}</b><small>${esc(x.location_name||x.address||x.item_type||'Part of your journey')}</small></div>${icon('ArrowUpRight')}</div>`).join(''):`<div class="empty-mini">${icon('CalendarPlus')}<p>There’s room for an adventure here.</p><button data-action="new-stop">Add a stop ${icon('ArrowRight')}</button></div>`}${state.scheduleExpanded?`<div class="home-full-schedule"><div class="home-schedule-day"><strong>${current?esc(fmtDate(current,{weekday:'long',day:'numeric',month:'long',year:'numeric'})):'No date selected'}</strong>${dayStops.length?dayStops.map(x=>`<div class="home-schedule-stop"><span>${esc(time(x.start_time)||'—')}</span><b>${esc(x.title)}</b><a href="${esc(maps(x))}" target="_blank" rel="noopener noreferrer" aria-label="See ${esc(x.title)} on Google Maps">${icon('MapPin')}</a></div>`).join(''):'<small>No stops planned for this day.</small>'}</div></div>`:''}</section><section class="panel assist-panel"><div class="assist-stars">${icon('Sparkles')}</div><div class="eyebrow">MEET YOUR CO-PILOT</div><h2>A little help goes<br>a long way.</h2><p>Ask about your plans, find nearby food, or turn a thought into an itinerary stop.</p><button class="btn dark" data-action="assistant">Talk to Travel Assist ${icon('ArrowRight')}</button></section></div><div class="section-head inspiration-title"><div><div class="eyebrow">EXPLORE THE POSSIBILITIES</div><h2>Go where curiosity takes you.</h2></div></div><div class="feature-grid explore-home-grid"><button data-action="explore-kind" data-value="place" class="feature-card"><span class="feature-icon coral">${icon('MapPin')}</span><b>Explore places</b><span>Find sights and experiences for this trip.</span>${icon('ArrowUpRight')}</button><button data-action="explore-kind" data-value="food" class="feature-card"><span class="feature-icon green">${icon('Utensils')}</span><b>Explore food</b><span>Browse restaurants, ratings and your picks.</span>${icon('ArrowUpRight')}</button></div><div class="section-head inspiration-title"><div><div class="eyebrow">AROUND YOU</div><h2>Food Finder.</h2></div></div><div class="feature-grid"><button data-action="food-finder" class="feature-card"><span class="feature-icon coral">${icon('Utensils')}</span><b>Find food within 300 m</b><span>Use your location to find restaurants around you.</span>${icon('ArrowUpRight')}</button><button data-action="food-saved" class="feature-card"><span class="feature-icon green">${icon('Heart')}</span><b>Saved restaurants</b><span>Restaurants you have saved for this trip.</span>${icon('ArrowUpRight')}</button></div></div>`;}
const distanceMeters=(a,b,c,d)=>{const rad=Math.PI/180,p1=a*rad,p2=c*rad,dp=(c-a)*rad,dl=(d-b)*rad,h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 12742000*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
function nearbyKey(row){
  return String(row?.name||'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,'').trim();
}
function nearbyCatalogRows(kind,latitude,longitude,radius){
  const source=kind==='food'?state.restaurants:state.places;
  const savedIds=new Set((kind==='food'?state.savedFood:state.savedPlaces).map(x=>Number(kind==='food'?x.restaurant_id:x.place_id)));
  return source
    .filter(x=>x.status==='active'&&inTripCountry(x))
    .filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)))
    .map(x=>({
      ...x,
      __source:'catalog',
      __kind:kind,
      saved:savedIds.has(Number(x.id)),
      __distance:Math.round(distanceMeters(latitude,longitude,Number(x.latitude),Number(x.longitude)))
    }))
    .filter(x=>x.__distance<=radius)
    .sort((a,b)=>a.__distance-b.__distance);
}
function mergeNearbyRows(localRows,googleRows,latitude,longitude,radius,kind){
  const merged=[...localRows];
  const localPlaceIds=new Set(localRows.map(x=>x.provider_place_id).filter(Boolean));
  const localNames=new globalThis.Map();
  for(const x of localRows){
    const key=nearbyKey(x);
    if(key&&!localNames.has(key))localNames.set(key,x);
  }
  for(const g of googleRows){
    const distance=Math.round(distanceMeters(latitude,longitude,Number(g.latitude),Number(g.longitude)));
    if(distance>radius)continue;
    if(g.provider_place_id&&localPlaceIds.has(g.provider_place_id))continue;
    const key=nearbyKey(g);
    const sameName=key?localNames.get(key):null;
    if(sameName&&Math.abs(Number(sameName.__distance)-distance)<=200)continue;
    merged.push({...g,__source:'google',__kind:kind,__distance:distance,saved:false});
  }
  return merged.sort((a,b)=>a.__distance-b.__distance);
}
function foodResult(r){
  const distance=Number.isFinite(Number(r.distance))?Math.round(Number(r.distance)):null;
  const meta=[distance!=null?`${distance} m away`:null,r.area||r.city||r.address].filter(Boolean).join(' · ');
  const isSaved=!!r.saved;
  return `<article class="food-result">
    <div>
      <b>${esc(r.name)}</b>
      <small>${esc(meta||'Nearby restaurant')}</small>
      <span>${esc(r.cuisine||r.place_type||'Food & drink')}</span>
    </div>
    <a href="${esc(maps(r))}" target="_blank" rel="noopener noreferrer" data-action="nearby-map" data-id="${esc(r.id||'')}" data-place-id="${esc(r.provider_place_id||'')}" aria-label="Open ${esc(r.name)} in Maps">${icon('MapPin')} Map</a>
    <button type="button" data-action="add-nearby-plan" data-id="${esc(r.id||'')}" data-place-id="${esc(r.provider_place_id||'')}">${icon('CalendarPlus')} Add to plan</button>
    ${isSaved?`<button type="button" disabled>${icon('Check')} Saved</button>`:`<button type="button" data-action="save-nearby" data-id="${esc(r.id||'')}" data-place-id="${esc(r.provider_place_id||'')}">${icon('Heart')} Save</button>`}
  </article>`;
}
async function findNearbyFood(){
  if(state.foodBusy)return;
  state.foodBusy=true;
  state.foodError='';
  render();
  try{
    const position=await new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('Location is not available on this device.'));
      navigator.geolocation.getCurrentPosition(resolve,reject,{
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:60000
      });
    });
    const latitude=Number(position.coords.latitude);
    const longitude=Number(position.coords.longitude);
    const radius=300;
    state.foodLocation={latitude,longitude};

    const local=nearbyCatalogRows('food',latitude,longitude,radius);
    let combined=local;

    // If Travelite already knows enough nearby food, avoid a Google call.
    if(local.length<8){
      const google=await browserNearbyPlaces({latitude,longitude,radius,kind:'food'});
      combined=mergeNearbyRows(local,google,latitude,longitude,radius,'food');
    }

    state.nearbyFood=combined.map(x=>({...x,distance:x.__distance})).slice(0,20);
  }catch(error){
    const denied=error?.code===1;
    state.foodError=denied?'Location permission is needed to find food around you.':(error?.message||'Could not find nearby food.');
  }finally{
    state.foodBusy=false;
    render();
  }
}
function foodView(){if(state.foodMode==='collection')return foodCollectionView();let loc=state.foodLocation, saved=state.savedFood.map(link=>state.restaurants.find(x=>x.id===link.restaurant_id)).filter(Boolean).filter(x=>loc&&Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude))&&x.latitude!=null&&x.longitude!=null).map(x=>({...x,distance:Math.round(distanceMeters(loc.latitude,loc.longitude,Number(x.latitude),Number(x.longitude))),saved:true})).filter(x=>x.distance<=300).sort((a,b)=>a.distance-b.distance);let google=state.nearbyFood.filter(x=>!saved.some(y=>(x.id&&Number(y.id)===Number(x.id))||(x.provider_place_id&&y.provider_place_id===x.provider_place_id)||(nearbyKey(y)&&nearbyKey(y)===nearbyKey(x))));return `${title('FOOD FINDER','A bite around the corner.','Restaurants within 300 m of your current location.',`<button class="btn outline" data-action="food-mode" data-value="collection">All food</button><button class="btn primary" data-action="food-refresh">${icon('Navigation')} Refresh location</button>`)}<div class="food-radius">${icon('MapPin')} 300 m radius · ${state.foodBusy?'Finding restaurants…':loc?'Nearest first':'Location needed'}</div>${state.foodError?`<div class="food-message">${esc(state.foodError)} <button data-action="food-refresh">Try again</button></div>`:''}${state.foodBusy?`<div class="loading">${icon('LoaderCircle','spin')}<p>Looking around you…</p></div>`:loc?`<div class="food-groups">${saved.length?`<h2>Your picks nearby</h2>${saved.map(x=>foodResult(x)).join('')}`:''}<h2>Restaurants around you</h2>${google.length?google.map(x=>foodResult(x)).join(''):'<p class="food-message">No other restaurants found within 300 m. Try again from another location.</p>'}</div>`:'<div class="empty-list">'+icon('Navigation')+'<h3>Find food near you.</h3><p>Allow location access to see restaurants within 300 m.</p><button class="btn primary" data-action="food-refresh">Find nearby food</button></div>'}`;}
function foodGroupLabel(r){let c=String(r.cuisine||'').toLowerCase();if(/sushi|sashimi|omakase/.test(c))return 'Sushi';if(/ramen|udon|soba|noodle/.test(c))return 'Noodles';if(/yakitori|kushiyaki/.test(c))return 'Yakitori';if(/tonkatsu|katsu/.test(c))return 'Katsu';if(/oyakodon|donburi|rice/.test(c))return 'Rice';if(/tempura/.test(c))return 'Tempura';if(/unagi|eel|seafood|fish/.test(c))return 'Seafood';if(/curry/.test(c))return 'Curry';if(/izakaya|japanese pub/.test(c))return 'Izakaya';if(/cafe|coffee|dessert|sweet|bakery|pastry|wagashi/.test(c))return 'Cafe & sweets';return String(r.cuisine||'Other').split(/[,/]/)[0].trim()||'Other';}

function foodIsTop100(r){
  if(r?.is_tabelog_top100 === true || r?.is_top100 === true) return true;
  const award=String(r?.tabelog_award||r?.award||r?.recognition||'').toLowerCase();
  return award.includes('top 100') || award.includes('top100');
}
function foodIsHot(r){
  if(r?.is_hot === true) return true;
  const award=String(r?.tabelog_award||r?.award||r?.recognition||'').toLowerCase();
  return award.includes('hot restaurant') || award.includes('hot');
}
function foodHasTabelog(r){
  return Boolean(
    r?.tabelog_url ||
    r?.tabelog_rating != null ||
    r?.is_tabelog ||
    r?.tabelog ||
    foodIsTop100(r)
  );
}

function foodCard(r,link){
  const scheduled=state.schedule
    .filter(x=>Number(x.restaurant_id)===Number(r.id))
    .sort((a,b)=>String(a.schedule_date).localeCompare(String(b.schedule_date)));
  const eaten=!!link?.is_eaten;
  const price=r.price||r.dinner_price||r.lunch_price;
  const place=[r.area||r.location,r.city]
    .filter(Boolean)
    .filter((v,i,a)=>a.indexOf(v)===i)
    .join(' · ');
  const savedMode=state.tab==='saved';
  const badge=(label,kind)=>`<span class="jfood-badge ${kind}">${label}</span>`;

  const saveAction=savedMode
    ? `${link
        ? `<button class="jfood-remove" data-action="save-catalog" data-kind="food" data-id="${r.id}">Remove from Saved</button>`
        : ''}`
    : `${link
        ? `<button class="jfood-saved-state" type="button" disabled>✓ Saved</button>`
        : `<button data-action="save-catalog" data-kind="food" data-id="${r.id}">♡ Save</button>`}`;

  const manageActions=savedMode && link
    ? `<button data-action="food-pick" data-id="${r.id}">${link.is_pick?'★ Pick':'☆ Pick'}</button>
       <button data-action="food-flexible" data-id="${r.id}">${link.is_flexible?'🌙 Flex':'+ Flex'}</button>
       <button data-action="food-eaten" data-id="${r.id}">${eaten?'↶ Undo eaten':'✓ Eaten'}</button>`
    : '';

  return `<article class="jfood-card ${eaten?'is-eaten':''}">
    <div class="jfood-card-head">
      <div class="jfood-mark">${icon('Utensils')}</div>
      <div class="jfood-title">
        <h3>${esc(r.name)}</h3>
        ${r.name_japanese?`<small lang="ja">${esc(r.name_japanese)}</small>`:''}
        <p>${icon('MapPin')} ${esc(place||r.country||'Explore')}</p>
      </div>
    </div>
    <div class="jfood-badges">
      ${badge(esc(r.cuisine||'Food & drink'),'cuisine')}
      ${link?.is_pick?badge('⭐ Pick','pick'):''}
      ${link?.is_flexible?badge('🌙 Flexible','flex'):''}
      ${foodIsTop100(r)?badge('🏆 Top 100','top'):''}
      ${foodIsHot(r)?badge('🔥 Hot','hot'):''}
      ${scheduled.length?badge('📅 Scheduled','scheduled'):''}
      ${eaten?badge(`✓ Eaten${link.eaten_at?' · '+esc(fmtDate(link.eaten_at.slice(0,10))):''}`,'eaten'):''}
      ${price?badge(esc(price),'price'):''}
      ${r.tabelog_rating!=null?badge(`⭐ ${esc(r.tabelog_rating)} Tabelog`,'rating'):''}
    </div>
    ${scheduled.length?`<div class="jfood-plan">${scheduled.map(x=>`📅 ${esc(fmtDate(x.schedule_date))}${x.start_time?' · '+esc(time(x.start_time)):''}`).join(' &nbsp; ')}</div>`:''}
    ${r.description?`<p class="jfood-description">${esc(r.description)}</p>`:''}
    <div class="jfood-actions">
      <a href="${esc(maps(r))}" target="_blank" rel="noopener noreferrer">${icon('MapPin')} Map</a>
      ${r.tabelog_url?.startsWith('https://')?`<a href="${esc(r.tabelog_url)}" target="_blank" rel="noopener noreferrer">🏆 Tabelog</a>`:''}
      ${r.booking_url?.startsWith('https://')?`<a href="${esc(r.booking_url)}" target="_blank" rel="noopener noreferrer">Book</a>`:''}
      <button data-action="schedule-catalog" data-kind="food" data-id="${r.id}">${icon('CalendarPlus')} Add to plan</button>
      ${manageActions}
      ${saveAction}
    </div>
  </article>`;
}
function foodSection(label,list,links){return list.length?`<section class="jfood-section"><h2>${label}<span>${list.length}</span></h2>${list.map(x=>foodCard(x,links.get(Number(x.id)))).join('')}</section>`:'';}
function foodCollectionView(){
  const links=new globalThis.Map(state.savedFood.map(x=>[Number(x.restaurant_id),x]));
  const country=state.trip?.country||'your destination';
  const all=state.restaurants.filter(x=>x.status==='active'&&inTripCountry(x));

  /*
    Navigation owns the mode:
    - Explore > Food & drink = Discover
    - Saved > Food = My Food
  */
  const savedMode=state.tab==='saved';
  const exploreMode=state.tab==='explore';
  const mine=savedMode;

  let source=mine
    ? all.filter(x=>links.has(Number(x.id)))
    : all;

  /*
    Same behaviour as the Japan food page:
    eaten restaurants are hidden from the normal Saved > Food list,
    but remain available through the dedicated Eaten filter.
  */
  if(mine && state.foodFilter!=='eaten'){
    source=source.filter(x=>!links.get(Number(x.id))?.is_eaten);
  }

  const cities=[...new Set(source.map(x=>x.city).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  const city=state.foodCity;
  const citySource=city?source.filter(x=>x.city===city):source;

  const areas=[...new Set(citySource.map(x=>x.area||x.location).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  const area=areas.includes(state.foodArea)?state.foodArea:'';
  const areaSource=area
    ? citySource.filter(x=>(x.area||x.location)===area)
    : citySource;

  const types=[...new Set(areaSource.map(foodGroupLabel))]
    .filter(Boolean)
    .sort((a,b)=>a.localeCompare(b));
  const type=types.includes(state.foodCuisine)?state.foodCuisine:'';

  const scheduledIds=new Set(
    state.schedule
      .filter(x=>x.restaurant_id!=null)
      .map(x=>Number(x.restaurant_id))
  );

  let items=areaSource
    .filter(x=>!type||foodGroupLabel(x)===type)
    .filter(x=>{
      const link=links.get(Number(x.id));
      switch(state.foodFilter){
        case 'picks': return !!link?.is_pick;
        case 'flexible': return !!link?.is_flexible;
        case 'scheduled': return scheduledIds.has(Number(x.id));
        case 'eaten': return !!link?.is_eaten;
        case 'tabelog': return foodHasTabelog(x);
        case 'top100': return foodIsTop100(x);
        case 'hot': return foodIsHot(x);
        default: return true;
      }
    })
    .filter(x=>
      !state.foodSearch ||
      [
        x.name,
        x.name_japanese,
        x.city,
        x.area,
        x.location,
        x.cuisine,
        x.description,
        x.tabelog_award,
        x.award,
        x.recognition
      ].some(v=>String(v||'').toLowerCase().includes(state.foodSearch.toLowerCase()))
    )
    .sort((a,b)=>
      Number(!!links.get(Number(b.id))?.is_pick)-Number(!!links.get(Number(a.id))?.is_pick) ||
      Number(foodIsTop100(b))-Number(foodIsTop100(a)) ||
      Number(foodIsHot(b))-Number(foodIsHot(a)) ||
      Number(!!links.has(Number(b.id)))-Number(!!links.has(Number(a.id))) ||
      Number(b.tabelog_rating||0)-Number(a.tabelog_rating||0)
    );

  const filters=mine
    ? [
        ['all','All'],
        ['picks','⭐ Picks'],
        ['flexible','🌙 Flexible'],
        ['scheduled','📅 Scheduled'],
        ['eaten','✓ Eaten']
      ]
    : [
        ['all','All'],
        ['tabelog','🏆 Tabelog'],
        ['top100','🏆 Tabelog 100'],
        ['hot','🔥 Hot'],
        ['eaten','✓ Eaten']
      ];

  let cards='';
  if(mine && state.foodFilter==='all' && items.length){
    const picks=items.filter(x=>links.get(Number(x.id))?.is_pick);
    const scheduled=items.filter(x=>
      !links.get(Number(x.id))?.is_pick &&
      scheduledIds.has(Number(x.id))
    );
    const flexible=items.filter(x=>
      !links.get(Number(x.id))?.is_pick &&
      !scheduledIds.has(Number(x.id)) &&
      links.get(Number(x.id))?.is_flexible
    );
    const saved=items.filter(x=>
      !links.get(Number(x.id))?.is_pick &&
      !scheduledIds.has(Number(x.id)) &&
      !links.get(Number(x.id))?.is_flexible
    );

    cards=
      foodSection('⭐ Picks',picks,links)+
      foodSection('📅 Scheduled',scheduled,links)+
      foodSection('🌙 Flexible / Maybe',flexible,links)+
      foodSection('❤️ Saved',saved,links);
  }else{
    cards=items.map(x=>foodCard(x,links.get(Number(x.id)))).join('');
  }

  const places=state.savedPlaces
    .map(s=>state.places.find(p=>p.id===s.place_id))
    .filter(Boolean);

  const savedKinds=savedMode
    ? `<div class="filter-row">
        ${[
          ['all',`All saved · ${places.length+state.savedFood.length}`],
          ['place',`Places · ${places.length}`],
          ['food',`Food · ${state.savedFood.length}`]
        ].map(([k,v])=>`<button data-action="saved-filter" data-value="${k}" class="${state.savedKind===k?'selected':''}">${v}</button>`).join('')}
      </div>`
    : '';

  const exploreKinds=exploreMode
    ? `<div class="filter-row explore-food-kinds">
        ${[['all','All discoveries'],['place','Places'],['food','Food & drink']]
          .map(([k,v])=>`<button data-action="filter" data-value="${k}" class="${state.kind===k?'selected':''}">${v}</button>`)
          .join('')}
        <span>${items.length} restaurants</span>
      </div>`
    : '';

  const heading=savedMode
    ? title(
        'A COLLECTION OF POSSIBILITIES',
        'The things you love.',
        'Every place worth remembering, ready when you are.',
        `<button class="btn outline" data-action="tab" data-value="explore">${icon('Compass')} Explore more</button>`
      )
    : title(
        'DISCOVER THE POSSIBILITIES',
        'Food & drink.',
        `Browse restaurants in ${esc(country)}, ready to save to your trip.`,
        `<button class="btn outline" data-action="food-mode" data-value="nearby">${icon('Navigation')} Within 300 m</button>
         <button class="btn primary" data-action="add-food">${icon('Plus')} Add food</button>`
      );

  return `${heading}
  ${savedKinds}
  ${exploreKinds}
  <div class="jfood-filters">
    <div class="jfood-filter-head">
      <span>FILTERS</span>
      <button data-action="food-clear" class="jfood-filter-reset" type="button">Reset</button>
    </div>
    <div class="jfood-chips jfood-city-chips">
      <button data-action="food-city" data-value="" class="${!city?'active':''}">All cities</button>
      ${cities.map(c=>`<button data-action="food-city" data-value="${esc(c)}" class="${city===c?'active':''}">${esc(c)}</button>`).join('')}
    </div>
    <div class="jfood-chips jfood-status-chips">
      ${filters.map(([key,label])=>`<button data-action="food-filter" data-value="${key}" class="${state.foodFilter===key?'active':''}">${label}</button>`).join('')}
    </div>
    <div class="jfood-fields">
      <label>Area
        <select data-food-select="area">
          <option value="">All areas</option>
          ${areas.map(a=>`<option value="${esc(a)}" ${area===a?'selected':''}>${esc(a)}</option>`).join('')}
        </select>
      </label>
      <label>Food type
        <select data-food-select="cuisine">
          <option value="">All food</option>
          ${types.map(t=>`<option value="${esc(t)}" ${type===t?'selected':''}>${esc(t)}</option>`).join('')}
        </select>
      </label>
      <label class="jfood-search-label">Search
        <input id="food-search" type="search" placeholder="Restaurant, food or neighbourhood…" value="${esc(state.foodSearch)}">
      </label>
    </div>
  </div>
  <div class="jfood-results-head">
    <strong>${mine?'❤️ My Food':'🔎 Discover Food'}</strong>
    <span>${items.length} restaurant${items.length===1?'':'s'}${mine&&state.foodFilter!=='eaten'?' · eaten hidden':''}</span>
  </div>
  <div class="jfood-list">
    ${cards||`<div class="empty-list">
      ${icon('Utensils')}
      <h3>${mine&&state.foodFilter==='all'?'No uneaten food saved yet':state.foodFilter==='eaten'?'Nothing marked as eaten yet':'No restaurants match these filters'}</h3>
      <p>${mine&&state.foodFilter==='all'?'Discover restaurants and save the ones you want to try.':state.foodFilter==='eaten'?'Mark a restaurant as Eaten after you visit it.':'Try another city, area, food type or search.'}</p>
      ${mine&&state.foodFilter==='all'
        ? `<button class="btn primary" data-action="go-discover-food">Discover food ${icon('ArrowRight')}</button>`
        : `<button class="btn outline" data-action="food-clear">Clear filters</button>`}
    </div>`}
  </div>`;
}
function dayRows(date=state.day){
  return state.schedule
    .filter(x=>x.schedule_date===date)
    .sort((a,b)=>(Number(a.sort_order||999)-Number(b.sort_order||999))||time(a.start_time).localeCompare(time(b.start_time)));
}
function dayRouteUrl(rows){
  const points=(rows||[])
    .filter(x=>
      Number.isFinite(Number(x.latitude)) &&
      Number.isFinite(Number(x.longitude))
    )
    .map(x=>`${Number(x.latitude)},${Number(x.longitude)}`);

  if(points.length<2)return '';

  const origin=points[0];
  const destination=points[points.length-1];
  const waypoints=points.slice(1,-1).slice(0,8);

  let url=
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;

  if(waypoints.length){
    url+=`&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
  }

  return url;
}
function addCatalogMatches(){
  const term=state.addSearch.trim().toLowerCase();
  const source=[
    ...state.places.map(x=>({...x,__kind:'place',__source:'catalog'})),
    ...state.restaurants.map(x=>({...x,__kind:'food',__source:'catalog'}))
  ].filter(x=>x.status==='active'&&inTripCountry(x)&&(state.addKind==='all'||x.__kind===state.addKind));
  if(!term){
    const savedPlaceIds=new Set(state.savedPlaces.map(x=>Number(x.place_id)));
    const savedFoodIds=new Set(state.savedFood.map(x=>Number(x.restaurant_id)));
    return source.filter(x=>x.__kind==='place'?savedPlaceIds.has(Number(x.id)):savedFoodIds.has(Number(x.id))).slice(0,8);
  }
  const score=x=>{
    const name=String(x.name||'').toLowerCase();
    const hay=[x.name,x.city,x.area,x.location,x.cuisine,x.place_type,x.country].map(v=>String(v||'').toLowerCase()).join(' ');
    if(name===term)return 0;
    if(name.startsWith(term))return 1;
    if(name.includes(term))return 2;
    if(hay.includes(term))return 3;
    return 99;
  };
  return source.map(x=>({...x,__score:score(x)})).filter(x=>x.__score<99).sort((a,b)=>a.__score-b.__score||String(a.name).localeCompare(String(b.name))).slice(0,12);
}
function addResultRow(x,kind=x.__kind||'place',source=x.__source||'catalog'){
  const meta=[x.area||x.city||x.location,x.city&&x.area?x.city:null].filter(Boolean).join(' · ')||x.address||x.country||'';
  const hasPhoto=source==='catalog'&&kind==='place'&&placePhotoIsStored(x);
  return `<button class="add-result-row" data-action="add-preview" data-kind="${kind}" data-source="${source}" ${source==='catalog'?`data-id="${x.id}"`:`data-index="${x.__googleIndex}"`}>
    <span class="add-result-art ${hasPhoto?'has-photo':''}" ${hasPhoto?`data-place-id="${x.id}"`:''}>${hasPhoto?placePhotoMarkup(x):icon(kind==='food'?'Utensils':'MapPin')}</span>
    <span class="add-result-copy"><b>${esc(x.name)}</b><small>${esc(meta)}</small><em>${source==='catalog'?'Travelite':'Google Maps'}</em></span>
    ${icon('ChevronRight')}
  </button>`;
}
function addPreviewView(x){
  if(!x)return '';
  const kind=x.__kind||'place',source=x.__source||'catalog';
  const saved=kind==='food'
    ? (source==='catalog'&&state.savedFood.some(s=>Number(s.restaurant_id)===Number(x.id)))
    : (source==='catalog'&&state.savedPlaces.some(s=>Number(s.place_id)===Number(x.id)));
  const photo=source==='catalog'&&kind==='place'&&placePhotoIsStored(x)
    ? `<div class="add-preview-photo" data-place-id="${x.id}">${placePhotoMarkup(x)}</div>`
    : `<div class="add-preview-photo add-preview-placeholder">${icon(kind==='food'?'Utensils':'MapPin')}</div>`;
  return `<div class="add-preview">
    <button class="add-back" data-action="add-preview-back">${icon('ArrowLeft')} Back to results</button>
    ${photo}
    <div class="add-preview-kicker">${kind==='food'?'FOOD & DRINK':'PLACE'} · ${source==='catalog'?'TRAVELITE':'GOOGLE MAPS'}</div>
    <h3>${esc(x.name)}</h3>
    <p>${icon('MapPin')} ${esc(x.area||x.city||x.address||state.trip?.country||'')}</p>
    ${x.description?`<div class="add-preview-desc">${esc(x.description)}</div>`:''}
    <a class="add-map-link" href="${esc(maps(x))}" target="_blank" rel="noopener noreferrer">${icon('Navigation')} Check ratings on Google Maps ${icon('ArrowUpRight')}</a>
    <div class="add-preview-actions">
      <button class="btn primary" data-action="add-selection-day">${icon('CalendarPlus')} Add to this day</button>
      <button class="btn outline ${saved?'is-saved':''}" data-action="save-selection">${icon(saved?'Check':'Heart')} ${saved?'Saved':'Save for later'}</button>
    </div>
  </div>`;
}
function addToDayView(){
  if(state.addSelection)return addPreviewView(state.addSelection);
  const matches=addCatalogMatches();
  const q=state.addSearch.trim();
  const google=state.googleResults.map((x,i)=>({...x,__source:'google',__kind:x.__kind||(state.addKind==='food'?'food':'place'),__googleIndex:i}));
  return `<div class="add-sheet">
    <div class="add-day-context">${icon('CalendarDays')} <span><small>ADDING TO</small><b>${esc(fmtDate(state.day,{weekday:'long',day:'numeric',month:'long'}))}</b></span></div>
    <div class="add-search-wrap">
      ${icon('Search')}
      <input id="add-day-search" type="search" value="${esc(state.addSearch)}" placeholder="Fushimi Inari, ramen near Gion…" autocomplete="off">
      ${state.addSearch?`<button data-action="add-clear-search" aria-label="Clear search">${icon('X')}</button>`:''}
    </div>
    <div class="add-kind-row">
      ${[['all','All'],['place','Places'],['food','Food']].map(([k,l])=>`<button data-action="add-kind" data-value="${k}" class="${state.addKind===k?'active':''}">${l}</button>`).join('')}
      <button data-action="add-nearby" class="add-nearby">${icon('Navigation')} Near me</button>
    </div>
    <div class="add-results-block">
      <div class="add-results-head"><b>${q?'From your Travelite collection':'Saved for later'}</b><span>${matches.length}</span></div>
      ${matches.length?matches.map(x=>addResultRow(x)).join(''):`<div class="add-empty">${icon('Search')}<p>${q?'Nothing in your collection matches yet.':'Save ideas and they will appear here.'}</p></div>`}
    </div>
    ${q.length>=3?`<div class="add-google-block">
      <div class="add-results-head"><b>More from Google</b><span>${state.googleBusy?'Searching…':google.length?google.length:''}</span></div>
      ${state.googleBusy?`<div class="add-empty">${icon('LoaderCircle','spin')}<p>Searching Google Places…</p></div>`:google.length?google.map(x=>addResultRow(x,x.__kind,'google')).join(''):`<button class="google-fallback" data-action="add-google-search">${icon('Search')} Search Google for “${esc(q)}” ${icon('ArrowRight')}</button>`}
    </div>`:''}
    <button class="add-custom-stop" data-action="new-custom-stop">${icon('Plus')} Add a custom note or stop</button>
  </div>`;
}

const publicPlaceCache=new globalThis.Map();

function claimCoordinate(entity){
  const value=entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  if(!value||!Number.isFinite(Number(value.latitude))||!Number.isFinite(Number(value.longitude)))return null;
  return {latitude:Number(value.latitude),longitude:Number(value.longitude)};
}
function hasClaim(entity,property){return Array.isArray(entity?.claims?.[property])&&entity.claims[property].length>0;}
function discoveryFit(distance){
  if(distance<=300)return {fit:'Easy walk',fitNote:'Very easy to combine with this stop.'};
  if(distance<=700)return {fit:'Nearby',fitNote:'Close enough to add without much backtracking.'};
  if(distance<=1400)return {fit:'Worth the walk',fitNote:'A longer walk, but still in the same area.'};
  return {fit:'Detour',fitNote:'Farther from this stop, so add it only if it is worth the extra travel.'};
}
function discoveryImportance(entity,wikiSummary,row){
  const sitelinks=entity?.sitelinks?Object.keys(entity.sitelinks).length:0;
  const description=String(entity?.descriptions?.en?.value||wikiSummary?.description||'').toLowerCase();
  const heritage=hasClaim(entity,'P1435')||hasClaim(entity,'P757');
  const majorWords=/world heritage|unesco|national museum|national park|castle|palace|cathedral|major shrine|major temple|historic monument|landmark/;
  const nicheWords=/museum|gallery|garden|shrine|temple|monument|historic|market|park|viewpoint|tower/;
  if(heritage||sitelinks>=45||majorWords.test(description)){
    return {importance:'Major attraction',importanceRank:4,reason:heritage?'Recognised heritage site with broad public significance.':'Strong Wikipedia/Wikidata presence suggests a major landmark.'};
  }
  if(sitelinks>=15||(wikiSummary?.extract&&nicheWords.test(description))){
    return {importance:'Go',importanceRank:3,reason:'Well documented and notable enough to be a strong nearby choice.'};
  }
  if(sitelinks>=4||wikiSummary?.extract){
    return {importance:'If interested',importanceRank:2,reason:'A recognised place, but more dependent on your interests.'};
  }
  return {importance:'Optional',importanceRank:1,reason:'Useful as a nearby filler rather than a must-see.'};
}
async function wikidataMatchForPlace(row){
  const key=[row.name,Math.round(Number(row.latitude||0)*1000),Math.round(Number(row.longitude||0)*1000)].join('|');
  if(publicPlaceCache.has(key))return publicPlaceCache.get(key);
  const task=(async()=>{
    const searchUrl='https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&language=en&uselang=en&limit=5&search='+encodeURIComponent(row.name||'');
    const search=await fetch(searchUrl).then(r=>r.ok?r.json():null).catch(()=>null);
    const ids=(search?.search||[]).map(x=>x.id).filter(Boolean);
    if(!ids.length)return {entity:null,wikiSummary:null};
    const entityUrl='https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=claims%7Csitelinks%7Cdescriptions%7Clabels&languages=en&sitefilter=enwiki&ids='+encodeURIComponent(ids.join('|'));
    const entityData=await fetch(entityUrl).then(r=>r.ok?r.json():null).catch(()=>null);
    const entities=ids.map(id=>entityData?.entities?.[id]).filter(Boolean);
    const lat=Number(row.latitude),lng=Number(row.longitude);
    let entity=entities[0]||null;
    if(Number.isFinite(lat)&&Number.isFinite(lng)){
      const located=entities.map(e=>{
        const coord=claimCoordinate(e);
        return {e,coord,d:coord?distanceMeters(lat,lng,coord.latitude,coord.longitude):Infinity};
      }).sort((a,b)=>a.d-b.d);
      if(located[0]?.d<=3000)entity=located[0].e;
    }
    const title=entity?.sitelinks?.enwiki?.title||'';
    let wikiSummary=null;
    if(title){
      wikiSummary=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title))
        .then(r=>r.ok?r.json():null).catch(()=>null);
    }
    return {entity,wikiSummary};
  })();
  publicPlaceCache.set(key,task);
  return task;
}
async function enrichDiscoveryPlace(row){
  try{
    const {entity,wikiSummary}=await wikidataMatchForPlace(row);
    const distance=Number(row.__distance)||0;
    const importance=discoveryImportance(entity,wikiSummary,row);
    const fit=discoveryFit(distance);
    return {
      ...row,
      __public:{
        wikidata_id:entity?.id||null,
        wikipedia_title:entity?.sitelinks?.enwiki?.title||null,
        description:wikiSummary?.description||entity?.descriptions?.en?.value||null,
        extract:wikiSummary?.extract||null,
        sitelinks:entity?.sitelinks?Object.keys(entity.sitelinks).length:0,
        heritage:hasClaim(entity,'P1435')||hasClaim(entity,'P757')
      },
      ...importance,
      ...fit
    };
  }catch{
    const fit=discoveryFit(Number(row.__distance)||0);
    return {...row,importance:'Optional',importanceRank:1,reason:'Nearby place with limited public-source information.',...fit};
  }
}
async function enrichDiscoveryRows(rows){
  const first=rows.slice(0,12);
  const enriched=await Promise.all(first.map(enrichDiscoveryPlace));
  return [...enriched,...rows.slice(12).map(row=>({...row,importance:'Optional',importanceRank:1,...discoveryFit(Number(row.__distance)||0)}))];
}
function aroundStopLabel(row){
  const importance=row.importance||'Optional';
  const fit=row.fit||discoveryFit(Number(row.__distance)||9999).fit;
  const note=[row.reason,row.fitNote].filter(Boolean).join(' ');
  return {label:`${importance} · ${fit}`,note};
}

function inferPlanningCity(){
  const counts=new globalThis.Map();
  const add=value=>{
    const city=String(value||'').trim();
    if(city)counts.set(city,(counts.get(city)||0)+1);
  };
  for(const link of state.savedPlaces){
    const place=state.places.find(x=>Number(x.id)===Number(link.place_id));
    add(place?.city);
  }
  for(const row of state.schedule){
    if(!row.place_id)continue;
    const place=state.places.find(x=>Number(x.id)===Number(row.place_id));
    add(place?.city);
  }
  if(counts.size)return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0][0];
  for(const row of state.places.filter(x=>x.status==='active'&&inTripCountry(x)&&x.city))add(row.city);
  return counts.size?[...counts.entries()].sort((a,b)=>b[1]-a[1])[0][0]:'';
}

function deterministicShuffle(rows,seedText=''){
  let seed=0;
  for(const ch of String(seedText))seed=((seed*31)+ch.charCodeAt(0))>>>0;
  const out=[...rows];
  for(let i=out.length-1;i>0;i--){
    seed=(1664525*seed+1013904223)>>>0;
    const j=seed%(i+1);
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function walkingMinutes(distance){
  const metres=Number(distance);
  if(!Number.isFinite(metres)||metres<=0)return null;
  return Math.max(1,Math.round(metres/80));
}

function discoveryCardSignal(row){
  const importance=row.importance||'Optional';
  const distance=Number(row.__distance);
  const mins=walkingMinutes(distance);
  let label=importance;
  if(importance==='Go')label='Popular stop';
  if(importance==='If interested'&&Number.isFinite(distance)&&distance<=700)label='Convenient stop';
  return {
    label,
    meta:[row.fit,mins?mins+' min away':null].filter(Boolean).join(' · '),
    note:row.reason||row.fitNote||''
  };
}

function discoveryView(){
  const rows=state.aroundResults||[];
  const modeLabel=state.discoveryMode==='between'?'BETWEEN YOUR STOPS':'START YOUR DAY';
  const leadIcon=state.discoveryMode==='between'?'Route':'Sparkles';
  return `<div class="around-sheet">
    <div class="around-anchor">
      <span class="around-anchor-icon">${icon(leadIcon)}</span>
      <span><small>${modeLabel}</small><b>${esc(state.discoveryTitle||'Ideas for this day')}</b><em>${esc(state.discoverySubtitle||'')}</em></span>
    </div>
    <p class="around-explainer">Suggestions are temporary. Travelite checks its own library first and uses Google only when needed. Nothing is added to Supabase until you choose Save or Add to this day.</p>
    ${state.aroundBusy?`<div class="add-empty around-loading">${icon('LoaderCircle','spin')}<p>Finding useful places…</p></div>`:rows.length?`<div class="around-results">${rows.map((x,i)=>{
      const signal=discoveryCardSignal(x);
      const type=String(x.place_type||'attraction').replaceAll('_',' ');
      return `<article class="around-card">
        <div class="around-card-head">
          <span class="around-rank">${i+1}</span>
          <div><h3>${esc(x.name)}</h3><p>${esc([x.__legLabel,signal.meta,type].filter(Boolean).join(' · '))}</p></div>
        </div>
        <div class="around-signal"><b>${esc(signal.label)}</b><span>${esc(signal.note)}</span></div>
        <div class="around-actions">
          <a href="${esc(maps(x))}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(x.name)} in Google Maps">${icon('MapPin')} Google Maps</a>
          <button data-action="around-save" data-index="${i}">${icon('Heart')} Save</button>
          <button class="around-add" data-action="around-add" data-index="${i}">${icon('CalendarPlus')} Add to this day</button>
        </div>
      </article>`;
    }).join('')}</div>`:`<div class="add-empty">${icon('MapPin')}<p>No suggestions came back. You can still add your own place.</p></div>`}
  </div>`;
}

async function findStarterSuggestions(){
  state.discoveryMode='starter';
  state.starterCity=inferPlanningCity();
  const destination=state.starterCity||state.trip?.name||state.trip?.country||'your destination';
  state.discoveryTitle=state.starterCity||state.trip?.name||'Starter ideas';
  state.discoverySubtitle='Up to 5 ideas · nothing is saved until you choose it';
  state.aroundResults=[];
  state.aroundBusy=true;
  state.modal={type:'discovery'};
  render();

  try{
    const scheduledIds=new Set(dayRows(state.day).map(x=>Number(x.place_id)).filter(Boolean));
    let local=state.places
      .filter(x=>x.status==='active'&&inTripCountry(x))
      .filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)))
      .filter(x=>!scheduledIds.has(Number(x.id)))
      .filter(x=>!state.starterCity||String(x.city||'').toLowerCase()===String(state.starterCity).toLowerCase())
      .map(x=>({...x,__source:'catalog',__kind:'place'}));

    local=deterministicShuffle(local,String(state.trip?.id)+'|'+String(state.day)+'|'+destination).slice(0,8);
    let combined=[...local];

    if(combined.length<5){
      const google=await browserTextPlaces('top attractions in '+destination+' '+(state.trip?.country||''),'place',10);
      combined.push(...google.map(x=>({...x,__source:'google',__kind:'place'})));
    }

    const unique=[];
    const seen=new Set();
    for(const row of combined){
      const key=row.provider_place_id||nearbyKey(row);
      if(!key||seen.has(key))continue;
      seen.add(key);
      unique.push(row);
      if(unique.length>=10)break;
    }

    const enriched=await enrichDiscoveryRows(unique);
    state.aroundResults=enriched
      .sort((a,b)=>(Number(b.importanceRank)||0)-(Number(a.importanceRank)||0))
      .slice(0,5);
  }catch(e){
    console.error('Starter suggestions failed',e);
    toast(e?.message||'Could not load starter suggestions.',true);
  }finally{
    state.aroundBusy=false;
    render();
  }
}

function routePointDistanceMeters(lat,lng,aLat,aLng,bLat,bLng){
  const meanLat=((aLat+bLat+lat)/3)*Math.PI/180;
  const x=Math.cos(meanLat)*111320;
  const y=110540;
  const ax=aLng*x,ay=aLat*y,bx=bLng*x,by=bLat*y,px=lng*x,py=lat*y;
  const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
  const t=len2?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2)):0;
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}

async function findBetweenRoute(){
  const mapped=dayRows(state.day)
    .filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)));

  if(mapped.length<2){
    toast('Add at least two mapped places first.',true);
    return;
  }

  const legs=[];
  for(let i=0;i<mapped.length-1;i++){
    legs.push({
      index:i,
      from:mapped[i],
      to:mapped[i+1]
    });
  }

  state.discoveryMode='between';
  state.discoveryTitle='Places between your stops';
  state.discoverySubtitle=legs.length+' route '+(legs.length===1?'leg':'legs')+' checked';
  state.aroundResults=[];
  state.aroundBusy=true;
  state.modal={type:'discovery'};
  render();

  try{
    const anchorNames=new Set(
      mapped.map(x=>String(x.title||'').trim().toLowerCase())
    );
    const skipTypes=new Set([
      'restaurant','cafe','bakery','bar',
      'lodging','hotel','hostel'
    ]);

    const allCandidates=[];

    for(const leg of legs){
      const aLat=Number(leg.from.latitude);
      const aLng=Number(leg.from.longitude);
      const bLat=Number(leg.to.latitude);
      const bLng=Number(leg.to.longitude);

      const midpoint={
        latitude:(aLat+bLat)/2,
        longitude:(aLng+bLng)/2
      };

      const legDistance=distanceMeters(aLat,aLng,bLat,bLng);

      /*
        Keep the search local to this individual leg.
        Short legs get a compact radius; longer legs can search farther.
      */
      const radius=Math.min(
        10000,
        Math.max(1200,legDistance/2+900)
      );

      const corridorWidth=Math.min(
        1200,
        Math.max(450,legDistance*0.22)
      );

      const legLabel=
        String(leg.from.title||'Stop '+(leg.index+1))+
        ' → '+
        String(leg.to.title||'Stop '+(leg.index+2));

      const fitsLeg=row=>{
        const lat=Number(row.latitude);
        const lng=Number(row.longitude);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;

        const corridorDistance=routePointDistanceMeters(
          lat,lng,
          aLat,aLng,
          bLat,bLng
        );

        row.__distance=Math.round(corridorDistance);
        row.__legIndex=leg.index;
        row.__legLabel=legLabel;
        row.__legDistance=Math.round(legDistance);

        return corridorDistance<=corridorWidth;
      };

      let local=nearbyCatalogRows(
        'place',
        midpoint.latitude,
        midpoint.longitude,
        radius
      )
        .filter(x=>!anchorNames.has(String(x.name||'').trim().toLowerCase()))
        .filter(x=>!skipTypes.has(String(x.place_type||'').toLowerCase()))
        .filter(fitsLeg);

      let combined=local;

      /*
        Use Google only when this leg does not already have enough
        useful catalogue candidates.
      */
      if(local.length<4){
        const google=await browserNearbyPlaces({
          latitude:midpoint.latitude,
          longitude:midpoint.longitude,
          radius,
          kind:'place'
        });

        combined=mergeNearbyRows(
          local,
          google,
          midpoint.latitude,
          midpoint.longitude,
          radius,
          'place'
        )
          .filter(x=>!anchorNames.has(String(x.name||'').trim().toLowerCase()))
          .filter(x=>!skipTypes.has(String(x.place_type||'').toLowerCase()))
          .filter(fitsLeg);
      }

      /*
        Keep only a few candidates per leg before the Wiki enrichment.
        This prevents one busy area from swallowing the whole result set.
      */
      allCandidates.push(
        ...combined
          .sort((a,b)=>Number(a.__distance)-Number(b.__distance))
          .slice(0,5)
      );
    }

    const unique=[];
    const seen=new Set();

    for(const row of allCandidates){
      const key=
        row.provider_place_id ||
        nearbyKey(row) ||
        [row.latitude,row.longitude].join('|');

      if(!key||seen.has(key))continue;
      seen.add(key);
      unique.push(row);
    }

    const enriched=await enrichDiscoveryRows(unique.slice(0,30));

    state.aroundResults=enriched
      .sort((a,b)=>{
        const leg=(Number(a.__legIndex)||0)-(Number(b.__legIndex)||0);
        if(leg!==0)return leg;

        const importance=
          (Number(b.importanceRank)||0)-
          (Number(a.importanceRank)||0);

        if(importance!==0)return importance;

        return Number(a.__distance)-Number(b.__distance);
      })
      .slice(0,24);

  }catch(e){
    console.error('Between-route discovery failed',e);
    toast(e?.message||'Could not find places between these stops.',true);
  }finally{
    state.aroundBusy=false;
    render();
  }
}
function aroundStopView(){
  const stop=state.aroundStop;
  if(!stop)return '<div class="add-empty"><p>Choose a planned stop first.</p></div>';
  const rows=state.aroundResults||[];
  return `<div class="around-sheet">
    <div class="around-anchor">
      <span class="around-anchor-icon">${icon('MapPinned')}</span>
      <span><small>AROUND</small><b>${esc(stop.title)}</b><em>Within ${Math.round(state.aroundRadius/100)/10} km</em></span>
    </div>
    <p class="around-explainer">Travelite checks its own place library first, then uses Google only to fill gaps. Wikipedia and Wikidata help judge significance; distance helps judge how naturally a place fits this stop. Ratings are not fetched.</p>
    ${state.aroundBusy?`<div class="add-empty around-loading">${icon('LoaderCircle','spin')}<p>Finding popular places around ${esc(stop.title)}…</p></div>`:rows.length?`<div class="around-results">${rows.map((x,i)=>{
      const distance=Number.isFinite(Number(x.__distance))?Math.round(Number(x.__distance)):null;
      const tag=aroundStopLabel(x);
      const type=String(x.place_type||'attraction').replaceAll('_',' ');
      return `<article class="around-card">
        <div class="around-card-head">
          <span class="around-rank">${i+1}</span>
          <div><h3>${esc(x.name)}</h3><p>${esc([distance!=null?(distance<1000?`${distance} m away`:`${(distance/1000).toFixed(1)} km away`):null,type].filter(Boolean).join(' · '))}</p></div>
        </div>
        <div class="around-signal"><b>${esc(tag.label)}</b><span>${esc(tag.note)}</span></div>
        <div class="around-actions">
          <a href="${esc(maps(x))}" target="_blank" rel="noopener noreferrer">${icon('MapPin')} Google Maps</a>
          <button data-action="around-save" data-index="${i}">${icon('Heart')} Save</button>
          <button class="around-add" data-action="around-add" data-index="${i}">${icon('CalendarPlus')} Add to this day</button>
        </div>
      </article>`;
    }).join('')}</div>`:`<div class="add-empty">${icon('MapPin')}<p>No nearby attractions came back for this stop.</p></div>`}
  </div>`;
}
async function findAroundStop(stop){
  if(!stop)return;
  const latitude=Number(stop.latitude),longitude=Number(stop.longitude);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){
    toast('This stop needs a map location before Travelite can look around it.',true);
    return;
  }
  state.aroundStop=stop;
  state.aroundResults=[];
  state.aroundBusy=true;
  state.modal={type:'aroundStop',data:{stopId:stop.id}};
  render();

  try{
    const anchorName=String(stop.title||'').trim().toLowerCase();
    const radius=Number(state.aroundRadius)||2000;
    const skipTypes=new Set(['restaurant','cafe','bakery','bar','lodging','hotel','hostel']);

    const local=nearbyCatalogRows('place',latitude,longitude,radius)
      .filter(x=>String(x.name||'').trim().toLowerCase()!==anchorName)
      .filter(x=>x.__distance>=20)
      .filter(x=>!skipTypes.has(String(x.place_type||'').toLowerCase()));

    let combined=local;

    // Ten useful local POIs is enough for an Around search without paying Google.
    if(local.length<10){
      const google=await browserNearbyPlaces({latitude,longitude,radius,kind:'place'});
      combined=mergeNearbyRows(local,google,latitude,longitude,radius,'place')
        .filter(x=>String(x.name||'').trim().toLowerCase()!==anchorName)
        .filter(x=>x.__distance>=20)
        .filter(x=>!skipTypes.has(String(x.place_type||'').toLowerCase()));
    }

    const enriched=await enrichDiscoveryRows(combined.slice(0,20));
    state.aroundResults=enriched
      .sort((a,b)=>{
        const importance=(Number(b.importanceRank)||0)-(Number(a.importanceRank)||0);
        if(importance!==0)return importance;
        return Number(a.__distance)-Number(b.__distance);
      })
      .map((x,i)=>({...x,nearby_rank:i+1}));
  }catch(e){
    console.error('Around here failed',e);
    toast(e?.message||'Could not load nearby places.',true);
  }finally{
    state.aroundBusy=false;
    render();
  }
}
function planView(){
  let t=state.trip,days=dayList(t);
  if(!state.day||!days.includes(state.day))state.day=days.find(d=>d>=today())||days[0]||today();
  let rows=dayRows(state.day),dayNo=days.indexOf(state.day)+1,route=dayRouteUrl(rows);
  const bookingsToday=state.bookings.filter(b=>b.booking_date===state.day);
  return `${title('PLAN','Build your trip, one day at a time.','Add your main stops, then use Around here to discover ideas that fit the route.','')}
    <div class="day-strip plan-day-strip">${days.length?days.map((d,i)=>`<button class="day-pill ${state.day===d?'active':''}" data-action="day" data-value="${d}"><small>DAY ${String(i+1).padStart(2,'0')}</small><b>${fmtDate(d,{weekday:'short'})}</b><span>${fmtDate(d,{day:'numeric',month:'short'})}</span><i class="${state.schedule.some(x=>x.schedule_date===d)?'has-stops':''}"></i></button>`).join(''):`<div class="empty-note">Add dates to this trip to build its itinerary. <button data-action="edit-trip">Add dates ${icon('ArrowRight')}</button></div>`}</div>
    <div class="plan-workspace">
      <section class="plan-day-panel">
        <div class="day-heading">
          <div>
            <div class="eyebrow">${dayNo>0?`DAY ${String(dayNo).padStart(2,'0')} · ${fmtDate(state.day,{weekday:'long',day:'numeric',month:'long'})}`:'YOUR DAY'}</div>
            <h2>${rows.length?`${rows.length} ${rows.length===1?'stop':'stops'} planned`:'Nothing planned yet'}</h2>
          </div>
          <div class="day-heading-actions">
            ${route?`<a class="icon-action" href="${esc(route)}" target="_blank" rel="noopener noreferrer">${icon('Route')} Day route</a>`:''}
            ${rows.filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude))).length>=2?`<button class="icon-action" data-action="between-route">${icon('Sparkles')} Between</button>`:''}
            <button class="icon-action plan-add-top" data-action="new-stop">${icon('Plus')} Add place</button>
          </div>
        </div>
        <div class="timeline plan-timeline">
          ${rows.length?rows.map((x,i)=>`<article class="stop plan-stop">
            <div class="stop-rail"><span>${time(x.start_time)||String(i+1).padStart(2,'0')}</span><i></i></div>
            <div class="stop-card">
              <div class="stop-card-top">
                <span class="stop-order">${i+1}</span>
                <span class="type-chip">${icon(x.item_type==='restaurant'?'Utensils':x.item_type==='transport'?'TrainFront':x.item_type==='accommodation'?'BedDouble':'MapPin')} ${esc(x.item_type||'stop')}</span>
                ${x.is_optional?'<span class="optional">OPTIONAL</span>':''}
                <span class="stop-reorder"><button data-action="move-stop" data-id="${x.id}" data-value="-1" ${i===0?'disabled':''} aria-label="Move up">↑</button><button data-action="move-stop" data-id="${x.id}" data-value="1" ${i===rows.length-1?'disabled':''} aria-label="Move down">↓</button></span>
              </div>
              <h3>${esc(x.title)}</h3>
              ${x.location_name||x.address?`<p>${icon('MapPin')} ${esc(x.location_name||x.address)}</p>`:''}
              ${x.description?`<p class="stop-desc">${esc(x.description)}</p>`:''}
              <div class="stop-actions compact-actions">
                <a href="${esc(directions(x))}" target="_blank" rel="noopener noreferrer">${icon('Navigation')} Go</a>
                ${Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude))?`<button data-action="around-stop" data-id="${x.id}">${icon('Search')} Around</button>`:''}
                <button data-action="edit-stop" data-id="${x.id}">${icon('Clock3')} Details</button>
                ${!x.is_locked?`<button data-action="delete-stop" data-id="${x.id}" class="quiet-danger" aria-label="Delete stop">${icon('Trash2')} Delete</button>`:''}
              </div>
            </div>
          </article>`).join(''):`<div class="empty-plan"><span>${icon('Route')}</span><h3>Start this day.</h3><p>Not sure where to begin? Let Travelite suggest up to 5 places for the city, or add a place you already know.</p><div class="starter-actions"><button class="btn primary" data-action="starter-suggest">${icon('Sparkles')} Suggest 5 places</button><button class="btn outline" data-action="new-stop">${icon('Plus')} Add your own</button></div></div>`}
          <button class="add-timeline" data-action="new-stop">${icon('Plus')} Add another place</button>
        </div>
      </section>
      <aside class="plan-tools">
        <div class="plan-summary-card">
          <div class="eyebrow">THIS DAY</div>
          <strong>${esc(fmtDate(state.day,{weekday:'long',day:'numeric',month:'long'}))}</strong>
          <div class="plan-summary-numbers"><span><b>${rows.length}</b>Stops</span><span><b>${bookingsToday.length}</b>Bookings</span></div>
          <p class="plan-summary-note">${route?'Day route follows your mapped stops in itinerary order.':'Add at least two mapped stops to build a day route.'}</p>
        </div>
        <div class="plan-helper-card">
          <div class="eyebrow">HOW TO USE PLAN</div>
          <h3>Know it? Add it.<br>Unsure? Look around.</h3>
          <p>Search the exact place when you already know your plan. Use <b>Around here</b> on any mapped stop to find useful nearby POIs. Travelite recommends what fits; ratings can be checked directly on Google Maps.</p>
          <button data-action="tab" data-value="saved">${icon('Heart')} ${state.savedPlaces.length+state.savedFood.length} saved ideas ${icon('ArrowRight')}</button>
        </div>
        ${bookingsToday.length?`<div class="plan-helper-card bookings-today"><div class="eyebrow">BOOKED TODAY</div>${bookingsToday.map(b=>`<p>${icon('Ticket')} ${esc(b.title)}</p>`).join('')}</div>`:''}
      </aside>
    </div>`;
}
const photoAttempts=new Set(), photoQueue=[], photoQueued=new Set();
let photoLoading=0;
async function drainPlacePhotos(){
  while(photoLoading<2&&photoQueue.length){
    const id=photoQueue.shift();photoQueued.delete(id);
    if(photoAttempts.has(id))continue;
    photoAttempts.add(id);photoLoading++;
    (async()=>{
      try{
        const {data,error}=await sb.functions.invoke('place-photo',{body:{place_id:id}});
        if(error||data?.error||!data?.photo?.image_url)return;
        const place=state.places.find(p=>Number(p.id)===id);
        if(place)Object.assign(place,data.photo);
        document.querySelectorAll(`.catalog-art[data-place-id="${id}"]`).forEach(el=>{
          if(place){el.innerHTML=placePhotoMarkup(place);el.classList.add('has-photo');}
        });
      }finally{photoLoading--;drainPlacePhotos();}
    })();
  }
}
function placePhotoMarkup(place){
  if(!place.image_url||!/^https:\/\//i.test(place.image_url))return icon('MapPin');
  const credit=place.image_author||'Wikimedia Commons';
  const href=place.image_source_url&&/^https:\/\//i.test(place.image_source_url)?place.image_source_url:'https://commons.wikimedia.org/';
  return `<img src="${esc(place.image_url)}" alt="${esc(place.name)}" loading="lazy"><a class="place-photo-credit" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="${esc(`${credit} · ${place.image_license||'photo'}`)}">© ${esc(credit)}</a>`;
}
function hydratePlacePhotos(){
  const targets=[...document.querySelectorAll('.catalog-art[data-place-id]:not(.has-photo)')];
  if(!targets.length||!state.user)return;
  const queue=el=>{const id=Number(el.dataset.placeId);if(!photoAttempts.has(id)&&!photoQueued.has(id)){photoQueued.add(id);photoQueue.push(id);drainPlacePhotos();}};
  if(!('IntersectionObserver' in window)){targets.slice(0,12).forEach(queue);return;}
  const observer=new IntersectionObserver((entries)=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue(entry.target);}}, {rootMargin:'300px'});
  targets.forEach(el=>observer.observe(el));
}
function catalogItem(x,kind){let saved=kind==='food'?state.savedFood.find(s=>s.restaurant_id===x.id):state.savedPlaces.find(s=>s.place_id===x.id);let meta=[x.area||x.city||x.location,x.cuisine||x.place_type].filter(Boolean).join(' · ');return `<article class="catalog-card"><div class="catalog-art ${kind==='food'?'food-art':'place-art'} ${kind==='place'&&placePhotoIsStored(x)?'has-photo':''}" ${kind==='place'?`data-place-id="${x.id}"`:''}>${kind==='place'&&placePhotoIsStored(x)?placePhotoMarkup(x):icon('MapPin')}</div><div class="catalog-info"><span class="catalog-kind">${kind==='food'?'FOOD & DRINK':'PLACE TO SEE'}</span><h3>${esc(x.name)}</h3><p>${icon('MapPin')} ${esc(meta||x.country||'Explore')}</p>${x.description?`<small>${esc(x.description.slice(0,125))}${x.description.length>125?'…':''}</small>`:''}<div class="catalog-actions"><button data-action="save-catalog" data-kind="${kind}" data-id="${x.id}" class="${saved?'is-saved':''}">${icon(saved?'Check':'Heart')} ${saved?'Saved':'Save'}</button><button data-action="schedule-catalog" data-kind="${kind}" data-id="${x.id}">${icon('CalendarPlus')} Add to plan</button><a href="${esc(maps(x))}" target="_blank" rel="noopener noreferrer" aria-label="View map">${icon('ArrowUpRight')}</a></div></div></article>`;}
function exploreView(){
  if(state.kind==='food'){
    return foodCollectionView();
  }

  let term=state.search.toLowerCase();
  let items=[...state.places.map(x=>({...x,__kind:'place'})),...state.restaurants.map(x=>({...x,__kind:'food'}))]
    .filter(x=>
      x.status==='active' &&
      inTripCountry(x) &&
      (!term||[x.name,x.city,x.area,x.cuisine,x.place_type,x.country]
        .some(v=>String(v||'').toLowerCase().includes(term))) &&
      (state.kind==='all'||x.__kind===state.kind)
    );

  return `${title(
    'DISCOVER THE POSSIBILITIES',
    'Go where curiosity takes you.',
    `Places and food in ${state.trip?.country||'your destination'}, ready to add to your trip.`,
    `<button class="btn outline" data-action="add-catalog">${icon('Plus')} Add a place</button>`
  )}
  <div class="search-line">
    <div class="searchbox">
      ${icon('Search')}
      <input id="catalog-search" placeholder="Search places, food, cities…" value="${esc(state.search)}" autocomplete="off">
    </div>
    <button class="assist-discover" data-action="google-from-explore">${icon('Search')} Search Google</button>
    <button class="assist-discover" data-action="assistant">${icon('Sparkles')} Ask for ideas</button>
  </div>
  <div class="filter-row">
    ${[['all','All discoveries'],['place','Places'],['food','Food & drink']]
      .map(([k,v])=>`<button data-action="filter" data-value="${k}" class="${state.kind===k?'selected':''}">${v}</button>`)
      .join('')}
    <span>${items.length} discoveries</span>
  </div>
  <div class="catalog-grid" id="catalog-results">
    ${items.slice(0,120).map(x=>catalogItem(x,x.__kind)).join('')||
      `<div class="empty-list">${icon('Search')}<h3>No matches in ${esc(state.trip?.country||'this destination')} yet</h3><p>Try another search, or add a place of your own.</p></div>`}
  </div>`;
}
function savedView(){
  let food=state.savedFood
    .map(s=>state.restaurants.find(r=>r.id===s.restaurant_id))
    .filter(Boolean)
    .map(x=>({...x,__kind:'food'}));

  let places=state.savedPlaces
    .map(s=>state.places.find(p=>p.id===s.place_id))
    .filter(Boolean)
    .map(x=>({...x,__kind:'place'}));

  if(state.savedKind==='food'){
    return foodCollectionView();
  }

  let items=[...places,...food]
    .filter(x=>state.savedKind==='all'||x.__kind===state.savedKind);

  return `${title(
    'A COLLECTION OF POSSIBILITIES',
    'The things you love.',
    'Every place worth remembering, ready when you are.',
    `<button class="btn outline" data-action="tab" data-value="explore">${icon('Compass')} Explore more</button>`
  )}
  <div class="filter-row">
    ${[
      ['all',`All saved · ${places.length+food.length}`],
      ['place',`Places · ${places.length}`],
      ['food',`Food · ${food.length}`]
    ].map(([k,v])=>`<button data-action="saved-filter" data-value="${k}" class="${state.savedKind===k?'selected':''}">${v}</button>`).join('')}
  </div>
  <div class="catalog-grid">
    ${items.length
      ? items.map(x=>catalogItem(x,x.__kind)).join('')
      : `<div class="empty-list">${icon('Heart')}<h3>Good things are worth keeping.</h3><p>Save places and restaurants while exploring. They’ll appear here on every device.</p><button class="btn primary" data-action="tab" data-value="explore">Explore places ${icon('ArrowRight')}</button></div>`}
  </div>`;
}
function bookingsView(){let rows=[...state.bookings].sort((a,b)=>(a.booking_date||'9999').localeCompare(b.booking_date||'9999'));return `${title('ALL THE DETAILS, ONE PLACE','Your bookings.','The confirmations and little details that make the journey smooth.',`<button class="btn primary" data-action="new-booking">${icon('Plus')} Add booking</button>`)}<div class="bookings-layout"><div class="stack">${rows.length?rows.map(x=>`<article class="booking-card"><div class="booking-icon">${icon(({accommodation:'BedDouble',restaurant:'Utensils',transport:'TrainFront',car:'Route',ticket:'Ticket',activity:'Compass'})[x.booking_type]||'Ticket')}</div><div class="booking-detail"><span class="catalog-kind">${esc(x.booking_type||'BOOKING')} · ${esc(x.status||'PLANNED')}</span><h3>${esc(x.title)}</h3><p>${[fmtDay(x.booking_date),time(x.start_time),x.location_name].filter(Boolean).map(esc).join(' · ')||'Date to be decided'}</p>${x.confirmation_number?`<div class="confirm-no">Confirmation ${esc(x.confirmation_number)}</div>`:''}<div class="booking-actions">${x.booking_url&&/^https:\/\//.test(x.booking_url)?`<a href="${esc(x.booking_url)}" target="_blank" rel="noopener noreferrer">Open booking ${icon('ArrowUpRight')}</a>`:''}<button data-action="edit-booking" data-id="${x.id}">Edit ${icon('ArrowRight')}</button></div></div></article>`).join(''):`<div class="empty-list">${icon('Ticket')}<h3>Keep the important things together.</h3><p>Add hotels, transport, tickets, and reservations. You’ll have the details when you need them.</p><button class="btn primary" data-action="new-booking">${icon('Plus')} Add your first booking</button></div>`}</div><div class="aside-card"><div class="eyebrow">A LITTLE PEACE OF MIND</div><h3>Ready when you are.</h3><p>Confirmation numbers and links are saved with your trip, so they’re easy to find on the move.</p></div></div>`;}
function expensesView(){let groups={};state.expenses.forEach(x=>groups[x.currency||'SGD']=(groups[x.currency||'SGD']||0)+Number(x.amount||0));return `${title('SPEND WELL, REMEMBER MORE','Trip spending.','Keep track of what you spend, in the currency you actually paid.',`<button class="btn primary" data-action="new-expense">${icon('Plus')} Add expense</button>`)}<div class="expense-totals">${Object.entries(groups).length?Object.entries(groups).map(([c,n])=>`<div class="total-card"><span>TOTAL IN ${esc(c)}</span><b>${esc(c)} ${n.toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}</b><small>${state.expenses.filter(x=>(x.currency||'SGD')===c).length} recorded expenses</small></div>`).join(''):`<div class="total-card"><span>YOUR TRIP, YOUR WAY</span><b>Start with a small spend.</b><small>Expenses appear here once you add them.</small></div>`}</div><div class="stack">${[...state.expenses].sort((a,b)=>(b.expense_date||'').localeCompare(a.expense_date||'')).map(x=>`<article class="expense-row"><div class="expense-icon">${icon(x.category==='food'?'Utensils':x.category==='transport'?'TrainFront':x.category==='accommodation'?'BedDouble':'Wallet')}</div><div><b>${esc(x.title)}</b><small>${esc(fmtDay(x.expense_date))} · ${esc(x.category)}</small></div><strong>${esc(x.currency||'SGD')} ${Number(x.amount).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><button data-action="edit-expense" data-id="${x.id}" aria-label="Edit expense">${icon('Pencil')}</button></article>`).join('')}</div>`;}
function modalView(){let m=state.modal;let heading={tripPicker:'Your trips',newTrip:'Create a trip',editTrip:'Edit your trip',deleteTrip:'Delete trip',addToDay:'Add to this day',aroundStop:'Around this stop',discovery:'Discover places',stop:'Plan a stop',booking:'Booking details',expense:'Record an expense',catalog:'Add a discovery',profile:'Your account',confirm:'One more thing',password:'Choose a new password',photoReview:'Photo checks'}[m.type]||'Details';return `<div class="overlay" data-action="close-modal"><div class="modal ${m.type==='tripPicker'?'trip-modal':''}" ><div class="modal-head"><div><div class="eyebrow">TRAVELITE</div><h2>${heading}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('X')}</button></div>${modalContent(m)}</div></div>`;}
function modalContent(m){if(m.type==='password')return `<form id="password-form" class="form-grid"><label class="span2">New password<input type="password" name="password" minlength="8" autocomplete="new-password" required></label><button class="btn primary full span2" type="submit">Save new password ${icon('ArrowRight')}</button></form>`;if(m.type==='tripPicker')return `<div class="trip-list">${state.trips.map(t=>`<div class="trip-option-row"><button data-action="select-trip" data-id="${t.id}" class="trip-option ${state.trip?.id===t.id?'selected':''}"><div class="trip-thumb" style="background-image:url('${esc(cover(t))}')"></div><span><b>${esc(t.name)}</b><small>${esc(dateRange(t.start_date,t.end_date))}</small></span>${icon(state.trip?.id===t.id?'Check':'ArrowRight')}</button>${t.owner_id===state.user?.id?`<button class="trip-delete-button" data-action="delete-trip" data-id="${t.id}" aria-label="Delete ${esc(t.name)}" title="Delete trip">${icon('Trash2')}</button>`:''}</div>`).join('')}</div><button class="btn primary full" data-action="new-trip">${icon('Plus')} Create another trip</button>`;
if(m.type==='deleteTrip'){let t=state.trips.find(x=>x.id===m.data?.id);return `<p class="modal-copy">Delete <strong>${esc(t?.name)}</strong> and its itinerary, bookings, expenses, and saved trip links? This cannot be undone. Places and restaurants in the shared collection will stay available.</p><form id="delete-trip-form" class="form-grid"><label class="span2">Type the trip name to confirm<input name="tripName" autocomplete="off" placeholder="${esc(t?.name)}" required></label><div class="modal-actions span2"><button type="button" class="btn outline" data-action="trip-picker">Cancel</button><button type="submit" class="btn danger">Delete trip ${icon('Trash2')}</button></div></form>`;}

if(m.type==='profile')return `<div class="profile-modal"><div class="profile-letter">${esc((state.user?.email||'T')[0].toUpperCase())}</div><b>${esc(state.user?.email||'')}</b><p>Signed in and synced with your Travelite account.</p><button class="btn outline full" data-action="photo-review">${icon('CheckCircle2')} Review uncertain place photos</button><button class="btn outline full" data-action="toggle-theme">${icon(state.theme==='dark'?'Sun':'Moon')} Switch to ${state.theme==='dark'?'light':'dark'} mode</button><button class="btn outline full" data-action="signout">${icon('LogOut')} Sign out</button></div>`;
if(m.type==='photoReview'){const rows=m.data?.rows||[];if(m.data?.loading)return `<div class="empty-mini">${icon('LoaderCircle','spin')}<p>Checking only the uncertain matches…</p></div>`;if(!rows.length)return `<div class="empty-mini">${icon('CheckCircle2')}<p>Nothing needs your review. Exact safe matches are saved automatically.</p></div>`;const x=rows[0],photo=x.image_candidate_url?`<img src="${esc(x.image_candidate_url)}" alt="Candidate for ${esc(x.name)}" style="width:100%;max-height:320px;object-fit:cover;border-radius:14px;margin:0 0 12px">`:`<div class="empty-mini" style="margin-bottom:12px">${icon('MapPin')}<p>No usable photo was found.</p></div>`;return `<div class="photo-review-card">${photo}<div class="eyebrow">REVIEW ${rows.length} LEFT</div><h3 style="margin:5px 0">${esc(x.name)}</h3><p class="modal-copy">${esc(x.city||x.country||'')}<br>${esc(x.image_review_reason||'This match needs a quick check.')}</p><div class="modal-actions"><button class="btn outline" data-action="photo-review-reject" data-id="${x.id}">Not right</button><button class="btn primary" data-action="photo-review-approve" data-id="${x.id}" ${x.image_candidate_url?'':'disabled'}>Use photo ${icon('Check')}</button></div><button class="delete-link" data-action="photo-review-missing" data-id="${x.id}">No photo for this place</button></div>`;}
if(m.type==='confirm')return `<p class="modal-copy">${esc(m.message)}</p><div class="modal-actions"><button class="btn outline" data-action="close-modal">Cancel</button><button class="btn danger" data-action="confirm-delete">Delete ${icon('Trash2')}</button></div>`;
if(m.type==='newTrip'||m.type==='editTrip'){let x=m.type==='editTrip'?state.trip:{};return `<form id="trip-form" class="form-grid"><label class="span2">Trip name<input name="name" value="${esc(x.name||'')}" placeholder="A summer in Italy" required></label><label class="span2">Country or destination<input name="country" value="${esc(x.country||'')}" placeholder="Italy" required></label><label>Start date<input name="start_date" type="date" value="${esc(x.start_date||'')}"></label><label>End date<input name="end_date" type="date" value="${esc(x.end_date||'')}"></label><label class="span2">A note about this trip <span class="optional-label">optional</span><textarea name="description" placeholder="What are you looking forward to?">${esc(x.description||'')}</textarea></label><button class="btn primary full span2" type="submit">${m.type==='editTrip'?'Save trip':'Create trip'} ${icon('ArrowRight')}</button></form>`;}
if(m.type==='addToDay')return addToDayView();
if(m.type==='aroundStop')return aroundStopView();
if(m.type==='discovery')return discoveryView();
if(m.type==='stop'){let x=m.data||{},dates=dayList(state.trip);return `<form id="stop-form" class="form-grid"><label class="span2">What’s happening?<input name="title" value="${esc(x.title||'')}" placeholder="Morning in Arashiyama" required></label><label>Date<select name="schedule_date" required>${dates.length?dates.map(d=>`<option value="${d}" ${(x.schedule_date||state.day)===d?'selected':''}>${fmtDay(d)}</option>`).join(''):`<option value="${today()}">${fmtDay(today())}</option>`}</select></label><label>Time <span class="optional-label">optional</span><input type="time" name="start_time" value="${time(x.start_time)}"></label><label class="span2">Category<select name="item_type">${[['attraction','Place to visit'],['restaurant','Food & drink'],['transport','Transport'],['accommodation','Stay'],['activity','Activity'],['other','Other']].map(([v,l])=>`<option value="${v}" ${x.item_type===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="span2">Location <span class="optional-label">optional</span><input name="location_name" value="${esc(x.location_name||'')}" placeholder="Where is it?"></label><label class="span2">Notes <span class="optional-label">optional</span><textarea name="notes" placeholder="Anything to remember?">${esc(x.notes||'')}</textarea></label><button class="btn primary full span2" type="submit">${x.id?'Save changes':'Add to itinerary'} ${icon('ArrowRight')}</button></form>`;}
if(m.type==='booking'){let x=m.data||{};return `<form id="booking-form" class="form-grid"><label class="span2">Booking name<input name="title" value="${esc(x.title||'')}" placeholder="Hotel, train, ticket…" required></label><label>Type<select name="booking_type">${[['accommodation','Hotel / stay'],['transport','Transport'],['restaurant','Restaurant'],['ticket','Ticket'],['car','Car'],['activity','Activity'],['other','Other']].map(([v,l])=>`<option value="${v}" ${x.booking_type===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Status<select name="status">${['planned','booked','cancelled'].map(v=>`<option value="${v}" ${x.status===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label><label>Date<input type="date" name="booking_date" value="${esc(x.booking_date||state.day||'')}"></label><label>Time<input type="time" name="start_time" value="${time(x.start_time)}"></label><label class="span2">Confirmation number<input name="confirmation_number" value="${esc(x.confirmation_number||'')}" placeholder="Optional"></label><label class="span2">Location<input name="location_name" value="${esc(x.location_name||'')}" placeholder="Optional"></label><label class="span2">Booking URL<input name="booking_url" type="url" value="${esc(x.booking_url||'')}" placeholder="https://..."></label><label class="span2">Notes<textarea name="notes" placeholder="Check-in time, directions, anything useful">${esc(x.notes||'')}</textarea></label><button class="btn primary full span2" type="submit">${x.id?'Save booking':'Add booking'} ${icon('ArrowRight')}</button>${x.id?`<button type="button" data-action="delete-booking" data-id="${x.id}" class="delete-link span2">${icon('Trash2')} Delete booking</button>`:''}</form>`;}
if(m.type==='expense'){let x=m.data||{};return `<form id="expense-form" class="form-grid"><label class="span2">What did you spend on?<input name="title" value="${esc(x.title||'')}" placeholder="Dinner, museum tickets…" required></label><label>Amount<input name="amount" type="number" min="0" step="0.01" value="${esc(x.amount??'')}" placeholder="0.00" required></label><label>Currency<input name="currency" maxlength="3" value="${esc(x.currency||'SGD')}" required></label><label>Category<select name="category">${['food','transport','accommodation','activity','shopping','other'].map(v=>`<option value="${v}" ${x.category===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label><label>Date<input name="expense_date" type="date" value="${esc(x.expense_date||today())}" required></label><label class="span2">Notes<textarea name="notes" placeholder="Optional">${esc(x.notes||'')}</textarea></label><button class="btn primary full span2" type="submit">${x.id?'Save expense':'Add expense'} ${icon('ArrowRight')}</button>${x.id?`<button type="button" data-action="delete-expense" data-id="${x.id}" class="delete-link span2">${icon('Trash2')} Delete expense</button>`:''}</form>`;}
if(m.type==='catalog')return `<div class="discovery-search"><div class="discovery-search-title">${icon('Search')} FIND IT ON GOOGLE</div><form id="google-search-form" class="google-search-form"><input name="query" type="search" minlength="3" placeholder="Search places or restaurants…" value="${esc(state.modal.searchQuery||'')}" required><button type="submit" ${state.googleBusy?'disabled':''}>${state.googleBusy?icon('LoaderCircle','spin'):icon('ArrowRight')}<span>Search</span></button></form><div id="google-results">${googleResultsView()}</div></div><div class="manual-divider"><span>OR ENTER DETAILS MANUALLY</span></div><form id="catalog-form" class="form-grid"><label class="span2">What are you adding?<select name="kind" id="catalog-kind"><option value="place">A place to visit</option><option value="food">A restaurant or café</option></select></label><label class="span2">Name<input name="name" placeholder="Name of the place" required></label><label>City<input name="city" placeholder="Kyoto"></label><label>Area<input name="area" placeholder="Gion"></label><label class="span2">Address<input name="address" placeholder="Optional"></label><label class="span2">Maps link<input name="maps_url" type="url" placeholder="https://maps.google.com/…"></label><label class="span2">Why is it worth a visit?<textarea name="description" placeholder="Optional"></textarea></label><button class="btn primary full span2" type="submit">Add and save to this trip ${icon('ArrowRight')}</button></form>`;
return '';}
function googleResultsView(){if(state.googleBusy)return `<p class="google-hint">${icon('LoaderCircle','spin')} Searching Google Places…</p>`;if(!state.googleResults.length)return state.modal?.searched?'<p class="google-hint">No results found. Try a more specific name or add it manually.</p>':'<p class="google-hint">Search by name, neighbourhood, or city. Choose a result to fill the form.</p>';return `<div class="google-results-list">${state.googleResults.map((r,i)=>`<button type="button" data-action="google-select" data-index="${i}" class="google-result ${state.catalogSelection?.provider_place_id===r.provider_place_id?'selected':''}"><span class="google-pin">${icon('MapPin')}</span><span><b>${esc(r.name)}</b><small>${esc(r.address||r.city||'Google Places')}</small></span>${icon(state.catalogSelection?.provider_place_id===r.provider_place_id?'Check':'ArrowRight')}</button>`).join('')}</div><div class="google-credit">Results from Google Maps</div>`;}
async function searchGoogle(form){
  const query=String(new FormData(form).get('query')||'').trim();
  if(query.length<3||state.googleBusy)return;

  const kind=$('#catalog-kind')?.value||'place';
  state.modal.searchQuery=query;
  state.modal.searched=false;
  state.googleBusy=true;

  const initial=$('#google-results');
  if(initial){
    initial.innerHTML=googleResultsView();
    drawIcons();
  }

  try{
    const destination=[
      query,
      state.trip?.country||''
    ].filter(Boolean).join(' ');

    const results=await browserTextPlaces(
      destination,
      kind,
      10
    );

    state.googleResults=results.map(x=>({
      ...x,
      __source:'google',
      __kind:kind
    }));

    state.modal.searched=true;
  }catch(e){
    console.error('Catalog Google search failed',e);
    state.googleResults=[];
    state.modal.searched=false;
    toast(e?.message||'Google search could not load.',true);
  }finally{
    state.googleBusy=false;
    const target=$('#google-results');
    if(target){
      target.innerHTML=googleResultsView();
      drawIcons();
    }
  }
}
function assistantView(){return `<div class="chat-backdrop" data-action="assistant-close"></div><section class="chat-panel"><header class="chat-head"><div class="chat-icon">${icon('Sparkles')}</div><div><b>Travel Assist</b><small>Here for the journey</small></div><button class="icon-btn" data-action="assistant-close" aria-label="Close">${icon('X')}</button></header><div class="chat-messages"><div class="chat-welcome">${icon('Sparkles')}<h2>Where can I take you?</h2><p>Ask me about this trip, a place to eat, or what to do next. I’ll check your plans and can search for new ideas.</p></div>${state.assistant.map((m,i)=>`<div class="bubble ${m.role}">${esc(m.text).replace(/\n/g,'<br>')}</div>${m.actions?.length?`<div class="chat-actions">${m.actions.map((a,j)=>`<button data-action="assist-proposal" data-message="${i}" data-index="${j}">${icon(a.kind==='map'?'Map':'CheckCircle2')} ${esc(a.label||a.title||'Review change')}</button>`).join('')}</div>`:''}`).join('')}${state.assistantBusy?`<div class="bubble assistant thinking">${icon('LoaderCircle','spin')} Thinking about your trip…</div>`:''}</div><form id="assist-form" class="chat-compose"><input name="message" placeholder="Ask me anything about your trip…" autocomplete="off" required ${state.assistantBusy?'disabled':''}><button aria-label="Send" ${state.assistantBusy?'disabled':''}>${icon('ArrowRight')}</button></form><div class="chat-foot">Trip changes always ask for your confirmation.</div></section>`;}
function openModal(type,data={}){if(type==='catalog'){state.googleResults=[];state.catalogSelection=null;state.googleBusy=false;}if(type==='addToDay'){state.addSearch='';state.addKind='all';state.addSelection=null;state.addNearby=false;state.googleResults=[];state.googleBusy=false;}if(type==='aroundStop'){state.aroundStop=data?.stop||null;state.aroundResults=[];state.aroundBusy=false;}if(type==='discovery'){state.aroundResults=[];state.aroundBusy=false;}state.modal={type,data};state.mobileMenu=false;render();if(type==='addToDay')setTimeout(()=>$('#add-day-search')?.focus(),0);}
const countryPhotoPending=new Set();
async function ensureCountryPhotos(countries){const names=[...new Set(countries.map(c=>String(c||'').trim().replace(/\s+/g,' ')).filter(Boolean))];if(!names.length)return;const keys=names.map(countryKey);const {data,error}=await sb.from('country_photos').select('*').in('country_key',keys);if(!error){for(const photo of data||[])state.countryPhotos[photo.country_key]=photo;render();}for(const name of names){const key=countryKey(name);if(state.countryPhotos[key]||countryPhotoPending.has(key))continue;countryPhotoPending.add(key);try{const {data:result,error:photoError}=await sb.functions.invoke('country-photo',{body:{country:name}});if(!photoError&&result?.photo&&state.user){state.countryPhotos[key]=result.photo;render();}}catch(e){console.warn('Country photo unavailable',e);}finally{countryPhotoPending.delete(key);}}}
function chooseTrip(trip){state.trip=trip;state.tab='home';state.search='';state.kind='all';state.foodFilter='all';state.foodTab='mine';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';state.day=dayList(trip).find(d=>d>=today())||dayList(trip)[0]||today();state.assistant=[];state.threadId=null;localStorage.setItem(`travelite.trip.${state.user.id}`,String(trip.id));state.modal=null;state.mobileMenu=false;state.loading=true;render();loadTripData();if(trip.country)ensureCountryPhotos([trip.country]);}
async function query(table,tripId){let r=await sb.from(table).select('*').eq('trip_id',tripId);if(r.error)throw r.error;return r.data||[];}
async function loadTrips(){let [a,b]=await Promise.all([sb.from('trips').select('*').order('start_date',{ascending:true,nullsFirst:false}),sb.from('trip_members').select('trip_id').eq('user_id',state.user.id)]);if(a.error)throw a.error;let all=a.data||[];state.trips=all;let stored=localStorage.getItem(`travelite.trip.${state.user.id}`);let current=all.find(t=>String(t.id)===stored)||all.find(t=>t.start_date&&t.end_date>=today())||all[0]||null;state.trip=current;if(all.length)void ensureCountryPhotos(all.map(t=>t.country));state.day=current?(dayList(current).find(d=>d>=today())||dayList(current)[0]||today()):null;}
async function loadTripData(){try{if(!state.trip){state.loading=false;render();return;}const id=state.trip.id;let [schedule,bookings,expenses,savedPlaces,savedFood,places,restaurants]=await Promise.all([query('schedule',id),query('bookings',id),query('trip_expenses',id),query('trip_places',id),query('trip_restaurants',id),sb.from('places').select('*').order('name'),sb.from('restaurants').select('*').order('name')]);if(places.error||restaurants.error)throw places.error||restaurants.error;if(state.trip?.id!==id)return;Object.assign(state,{schedule,bookings,expenses,savedPlaces,savedFood,places:places.data||[],restaurants:restaurants.data||[],loading:false});render();}catch(e){state.loading=false;render();toast(`Couldn't load this trip: ${e.message}`,true);}}
let catalogRebuildStarted=false;
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function rebuildPlaceCatalog(){
  if(catalogRebuildStarted||!state.user)return;
  catalogRebuildStarted=true;
  try{
    for(let batch=0;batch<80;batch++){
      const {data,error}=await sb.functions.invoke('place-enrichment',{body:{limit:10}});
      if(error||data?.error)throw Error(data?.error||error?.message||'Catalog rebuild paused.');
      if(!data.pending){toast('Place locations rebuilt.');break;}
      await wait(350);
    }
  }catch(error){
    console.warn('Catalog rebuild paused',error);
    toast('Catalog refresh paused. It will safely continue next time you open Travelite.',true);
  }finally{catalogRebuildStarted=false;}
}
let safePhotoCatalogStarted=false;
async function processSafePlacePhotos(){
  if(safePhotoCatalogStarted||!state.user)return;
  safePhotoCatalogStarted=true;
  try{
    for(let batch=0;batch<200;batch++){
      const {data,error}=await sb.functions.invoke('place-photo',{body:{mode:'next',limit:5}});
      if(error||data?.error)throw Error(data?.error||error?.message||'Photo check paused.');
      if(!data?.pending)break;
      await wait(300);
    }
  }catch(error){console.warn('Photo check paused',error);}
  finally{safePhotoCatalogStarted=false;}
}
async function openPhotoReview(){
  state.modal={type:'photoReview',data:{loading:true,rows:[]}};render();
  try{
    const {data,error}=await sb.from('places').select('id,name,city,country,image_candidate_url,image_review_reason').eq('image_status','review').order('name').limit(1000);
    if(error)throw error;
    if(state.modal?.type==='photoReview'){state.modal.data={loading:false,rows:data||[]};render();}
  }catch(error){toast(error.message||'Could not load photo review.',true);state.modal=null;render();}
}
async function reviewPlacePhoto(placeId,decision){
  const {data,error}=await sb.functions.invoke('place-photo-review',{body:{place_id:placeId,action:decision}});
  if(error||data?.error)throw Error(data?.error||error?.message||'Could not update this photo.');
  await openPhotoReview();
}
async function init(){
  try{
    const {data,error}=await sb.auth.getSession();
    if(error)throw error;
    state.user=data?.session?.user||null;

    if(state.user){
      await loadTrips();
      await loadTripData();
      void processSafePlacePhotos();
    }else{
      state.loading=false;
      render();
    }
  }catch(e){
    console.error('Travelite startup failed',e);
    state.loading=false;
    state.user=null;
    render();
    toast('Travelite could not restore your session. Please refresh or sign in again.',true);
  }

  sb.auth.onAuthStateChange((event,session)=>{
    setTimeout(async()=>{
      if(event==='PASSWORD_RECOVERY'&&session?.user){
        state.user=session.user;
        state.loading=true;
        render();
        try{
          await loadTrips();
          await loadTripData();
        }catch(e){
          state.loading=false;
          render();
        }
        state.modal={type:'password'};
        render();
      }else if(event==='SIGNED_OUT'){
        Object.assign(state,{user:null,trip:null,trips:[],countryPhotos:{},loading:false,assistantOpen:false});
        render();
      }else if(session?.user && session.user.id!==state.user?.id){
        state.user=session.user;
        state.loading=true;
        render();
        try{
          await loadTrips();
          await loadTripData();
        }catch(e){
          state.loading=false;
          render();
          toast(e.message,true);
        }
      }
    },0);
  });
}
const field = (fd,k) => String(fd.get(k)||'').trim();
const cleanForm = (fd,keys) => Object.fromEntries(keys.map(k=>[k,field(fd,k)||null]));
async function saveRow(table,payload,id){let q=id?sb.from(table).update(payload).eq('id',id):sb.from(table).insert(payload);let r=await q.select().single();if(r.error)throw r.error;return r.data;}

async function ensureCatalogSelection(selection){
  if(!selection)throw Error('Choose a place first.');
  const kind=selection.__kind||'place';
  const table=kind==='food'?'restaurants':'places';
  if(selection.__source!=='google')return {kind,row:selection};
  let existing=null;
  if(selection.provider_place_id){
    const found=await sb.from(table).select('*').eq('provider','google').eq('provider_place_id',selection.provider_place_id).limit(1).maybeSingle();
    if(found.error)throw found.error;
    existing=found.data;
  }
  if(existing)return {kind,row:existing};
  const base={
    name:selection.name,
    country:selection.country||state.trip?.country||null,
    prefecture:selection.prefecture||null,
    city:selection.city||null,
    area:selection.area||null,
    address:selection.address||null,
    latitude:selection.latitude??null,
    longitude:selection.longitude??null,
    maps_url:selection.maps_url||null,
    website_url:selection.website_url||null,
    phone:selection.phone||null,
    provider:'google',
    provider_place_id:selection.provider_place_id||null,
    created_by:state.user.id,
    status:'active',
    verified:false
  };
  if(kind==='food')base.cuisine=selection.cuisine||selection.place_type||null;
  else base.place_type=selection.place_type||'attraction';
  return {kind,row:await saveRow(table,base)};
}
async function addSelectionToDay(selection){
  const {kind,row}=await ensureCatalogSelection(selection);
  const rows=dayRows(state.day);
  const payload={
    trip_id:state.trip.id,
    schedule_date:state.day,
    sort_order:rows.length+1,
    title:row.name,
    item_type:kind==='food'?'restaurant':'attraction',
    location_name:row.area||row.city||row.name,
    address:row.address||null,
    latitude:row.latitude??null,
    longitude:row.longitude??null,
    maps_url:row.maps_url||null,
    [kind==='food'?'restaurant_id':'place_id']:row.id
  };
  await saveRow('schedule',payload);
  state.modal=null;
  state.addSelection=null;
  state.googleResults=[];
  state.tab='plan';
  await loadTripData();
  toast(`Added to ${fmtDate(state.day,{weekday:'short',day:'numeric',month:'short'})}.`);
}
async function saveSelectionForLater(selection){
  const {kind,row}=await ensureCatalogSelection(selection);
  const isFood=kind==='food',table=isFood?'trip_restaurants':'trip_places',column=isFood?'restaurant_id':'place_id';
  const existing=(isFood?state.savedFood:state.savedPlaces).find(x=>Number(x[column])===Number(row.id));
  if(!existing){
    const result=await sb.from(table).upsert({trip_id:state.trip.id,[column]:row.id},{onConflict:`trip_id,${column}`});
    if(result.error)throw result.error;
    toast('Saved for later.');
  }else toast('Already saved for later.');
  state.modal=null;
  state.addSelection=null;
  await loadTripData();
}
async function searchAddGoogle({nearby=false}={}){
  if(state.googleBusy)return;
  const q=state.addSearch.trim();
  if(!nearby&&q.length<3)return;

  state.googleBusy=true;
  state.googleResults=[];
  render();

  try{
    const kind=state.addKind==='food'?'food':'place';

    if(nearby){
      const position=await new Promise((resolve,reject)=>{
        if(!navigator.geolocation){
          reject(new Error('Location is not available on this device.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy:true,
            timeout:12000,
            maximumAge:60000
          }
        );
      });

      const latitude=Number(position.coords.latitude);
      const longitude=Number(position.coords.longitude);
      const radius=kind==='food'?1000:2000;

      const results=await browserNearbyPlaces({
        latitude,
        longitude,
        radius,
        kind
      });

      state.googleResults=results.map(x=>({
        ...x,
        __source:'google',
        __kind:kind
      }));

      state.addNearby=true;
    }else{
      const destination=[
        q,
        state.trip?.country||''
      ].filter(Boolean).join(' ');

      const results=await browserTextPlaces(
        destination,
        kind,
        10
      );

      state.googleResults=results.map(x=>({
        ...x,
        __source:'google',
        __kind:kind
      }));

      state.addNearby=false;
    }
  }catch(e){
    console.error('Add place Google search failed',e);

    const denied=e?.code===1;
    toast(
      denied
        ? 'Location permission is needed for Near me.'
        : (e?.message||'Could not search Google Places.'),
      true
    );
  }finally{
    state.googleBusy=false;
    render();
  }
}
async function moveDayStop(id,delta){
  const rows=dayRows(state.day);
  const index=rows.findIndex(x=>Number(x.id)===Number(id));
  const target=index+Number(delta);
  if(index<0||target<0||target>=rows.length)return;
  const reordered=[...rows];
  [reordered[index],reordered[target]]=[reordered[target],reordered[index]];
  const results=await Promise.all(reordered.map((row,i)=>sb.from('schedule').update({sort_order:i+1}).eq('id',row.id).eq('trip_id',state.trip.id)));
  const failed=results.find(x=>x.error);
  if(failed?.error)throw failed.error;
  state.schedule=state.schedule.map(row=>{
    const pos=reordered.findIndex(x=>x.id===row.id);
    return pos>=0?{...row,sort_order:pos+1}:row;
  });
  render();
}
async function handleForm(form){let fd=new FormData(form),id=state.modal?.data?.id;try{
if(form.id==='password-form'){let r=await sb.auth.updateUser({password:field(fd,'password')});if(r.error)throw r.error;state.modal=null;render();toast('Password updated.');return;}
if(form.id==='auth-form'){let email=field(fd,'email'),password=field(fd,'password'),mode=state.authMode;let r=mode==='signup'?await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):mode==='reset'?await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}):await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;if(mode==='reset'){toast('Password reset link sent. Check your email.');state.authMode='login';render();}else if(mode==='signup'&&!r.data.session)toast('Check your email to confirm your account.');return;}
if(form.id==='delete-trip-form'){let trip=state.trips.find(t=>t.id===state.modal?.data?.id);if(!trip||trip.owner_id!==state.user?.id)throw Error('Only the trip owner can delete it.');if(field(fd,'tripName')!==trip.name)throw Error('Type the trip name exactly to confirm.');let {data,error}=await sb.from('trips').delete().eq('id',trip.id).eq('owner_id',state.user.id).select('id');if(error)throw error;if(!data?.length)throw Error('Trip could not be deleted. Please try again.');state.trips=state.trips.filter(t=>t.id!==trip.id);state.modal=null;if(state.trip?.id===trip.id){state.trip=null;state.day=null;state.schedule=[];state.bookings=[];state.expenses=[];state.savedPlaces=[];state.savedFood=[];state.assistant=[];state.threadId=null;state.nearbyFood=[];state.scheduleExpanded=false;localStorage.removeItem(`travelite.trip.${state.user.id}`);if(state.trips.length)chooseTrip(state.trips[0]);else{state.loading=false;render();}}else render();toast('Trip deleted.');return;}
if(form.id==='trip-form'){let data=cleanForm(fd,['name','country','start_date','end_date','description']);if(data.start_date&&data.end_date&&data.end_date<data.start_date)throw Error('End date must be after start date.');let edit=state.modal.type==='editTrip';let trip=await saveRow('trips',edit?data:{...data,owner_id:state.user.id},edit?state.trip.id:null);if(edit){state.trip=trip;state.trips=state.trips.map(t=>t.id===trip.id?trip:t);state.modal=null;render();}else{state.trips.push(trip);chooseTrip(trip);}toast(edit?'Trip updated.':'New trip created.');return;}
if(!state.trip)throw Error('Choose a trip first.');
if(form.id==='stop-form'){let data=cleanForm(fd,['title','schedule_date','start_time','item_type','location_name','notes']);if(id){await saveRow('schedule',data,id);}else{data.trip_id=state.trip.id;data.sort_order=state.schedule.filter(x=>x.schedule_date===data.schedule_date).length+1;Object.assign(data,state.modal.data?.catalogLink||{});await saveRow('schedule',data);}state.day=data.schedule_date;state.tab='plan';toast(id?'Stop updated.':'Added to your plan.');}
if(form.id==='booking-form'){let data=cleanForm(fd,['title','booking_type','status','booking_date','start_time','confirmation_number','location_name','booking_url','notes']);await saveRow('bookings',id?data:{...data,trip_id:state.trip.id},id);toast(id?'Booking updated.':'Booking added.');}
if(form.id==='expense-form'){let data=cleanForm(fd,['title','amount','currency','category','expense_date','notes']);data.currency=data.currency.toUpperCase();await saveRow('trip_expenses',id?data:{...data,user_id:state.user.id,trip_id:state.trip.id},id);toast(id?'Expense updated.':'Expense added.');}
if(form.id==='catalog-form'){let kind=field(fd,'kind'),table=kind==='food'?'restaurants':'places',column=kind==='food'?'restaurant_id':'place_id';let input=cleanForm(fd,['name','city','area','address','maps_url','description']);let google=state.catalogSelection;let data={...input,country:state.trip.country||'Japan',created_by:state.user.id,status:'active',verified:false};if(google){Object.assign(data,{provider:'google',provider_place_id:google.provider_place_id,country:google.country||data.country,prefecture:google.prefecture,postal_code:google.postal_code,latitude:google.latitude,longitude:google.longitude,website_url:google.website_url,phone:google.phone});if(kind==='food')data.cuisine=google.cuisine;else data.place_type=google.place_type||'attraction';}else if(kind==='place')data.place_type='attraction';let existing=null;if(google?.provider_place_id){let r=await sb.from(table).select('id').eq('provider','google').eq('provider_place_id',google.provider_place_id).limit(1).maybeSingle();if(r.error)throw r.error;existing=r.data;}let row=existing||await saveRow(table,data);let relTable=kind==='food'?'trip_restaurants':'trip_places';let already=(kind==='food'?state.savedFood:state.savedPlaces).some(x=>x[column]===row.id);if(!already){let r=await sb.from(relTable).upsert({trip_id:state.trip.id,[column]:row.id},{onConflict:'trip_id,'+column});if(r.error)throw r.error;}toast(already?'Already saved to this trip.':'Added and saved to this trip.');state.catalogSelection=null;}
state.modal=null;await loadTripData();}catch(e){toast(e.message||'Something went wrong.',true);}}
async function action(a,el){let v=el.dataset.value,id=Number(el.dataset.id);try{switch(a){
case 'auth-mode':state.authMode=v;render();break;
case 'toggle-theme':state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('travelite.theme',state.theme);render();break;
case 'google-select':{const result=state.googleResults[Number(el.dataset.index)];if(!result)break;state.catalogSelection=result;const form=$('#catalog-form');for(const key of ['name','city','area','address','maps_url'])if(form.elements[key])form.elements[key].value=result[key]||'';$('#google-results').innerHTML=googleResultsView();drawIcons();toast('Place details added. Review and save below.');break;}
case 'tab':state.tab=v;state.mobileMenu=false;state.search='';render();window.scrollTo(0,0);break;
case 'toggle-schedule':state.scheduleExpanded=!state.scheduleExpanded;render();break;
case 'explore-kind':if(v==='food'){state.tab='explore';state.kind='food';state.foodMode='collection';state.foodFilter='all';state.foodTab='discover';}else{state.tab='explore';state.kind='place';}render();window.scrollTo(0,0);break;
case 'food-saved':state.tab='saved';state.savedKind='food';state.foodMode='collection';state.foodFilter='all';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';render();window.scrollTo(0,0);break;
case 'food-finder':state.tab='food';state.foodMode='nearby';render();window.scrollTo(0,0);findNearbyFood();break;
case 'food-mode':state.foodMode=v;render();if(v==='nearby'&&!state.foodLocation)findNearbyFood();break;
case 'food-filter':state.foodFilter=v;render();break;
case 'food-tab':if(v==='mine'){state.tab='saved';state.savedKind='food';}else{state.tab='explore';state.kind='food';}state.foodFilter='all';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';render();window.scrollTo(0,0);break;
case 'food-city':state.foodCity=v;state.foodArea='';state.foodCuisine='';render();break;
case 'food-clear':state.foodFilter='all';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';render();break;
case 'go-discover-food':state.tab='explore';state.kind='food';state.foodFilter='all';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';render();window.scrollTo(0,0);break;
case 'add-food':openModal('catalog');$('#catalog-kind').value='food';break;
case 'food-pick':case 'food-flexible':{let link=state.savedFood.find(x=>Number(x.restaurant_id)===id);if(!link)break;let field=a==='food-pick'?'is_pick':'is_flexible';let result=await sb.from('trip_restaurants').update({[field]:!link[field]}).eq('id',link.id).eq('trip_id',state.trip.id).select().single();if(result.error)throw result.error;state.savedFood=state.savedFood.map(x=>x.id===link.id?result.data:x);render();break;}
case 'food-eaten':{let link=state.savedFood.find(x=>Number(x.restaurant_id)===id);if(!link)break;let value=!link.is_eaten;let result=await sb.from('trip_restaurants').update({is_eaten:value,eaten_at:value?new Date().toISOString():null}).eq('id',link.id).eq('trip_id',state.trip.id).select().single();if(result.error)throw result.error;state.savedFood=state.savedFood.map(x=>x.id===link.id?result.data:x);render();break;}
case 'food-refresh':findNearbyFood();break;
case 'nearby-map':{let result=state.nearbyFood.find(x=>x.provider_place_id===el.dataset.placeId)||state.restaurants.find(x=>Number(x.id)===id);if(result)window.open(el.href||maps(result),'_blank','noopener,noreferrer');break;}
case 'add-nearby-plan':{let result=state.nearbyFood.find(x=>(el.dataset.placeId&&x.provider_place_id===el.dataset.placeId)||(id&&Number(x.id)===id))||state.restaurants.find(x=>Number(x.id)===id);if(!result)break;const selection={...result,__source:result.__source||((result.id&&!result.provider_place_id)?'catalog':'google'),__kind:'food'};await addSelectionToDay(selection);break;}
case 'save-nearby':{let result=state.nearbyFood.find(x=>(el.dataset.placeId&&x.provider_place_id===el.dataset.placeId)||(id&&Number(x.id)===id));if(!result)break;await saveSelectionForLater({...result,__source:result.__source||'google',__kind:'food'});break;}
case 'day':state.day=v;render();break;
case 'filter':if(v==='food'&&state.kind!=='food'){state.foodTab='discover';state.foodFilter='all';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';}state.kind=v;render();break;
case 'saved-filter':state.savedKind=v;if(v==='food'){state.foodFilter='all';state.foodCity='';state.foodArea='';state.foodCuisine='';state.foodSearch='';}render();break;
case 'menu':state.mobileMenu=true;render();break;
case 'close-menu':state.mobileMenu=false;render();break;
case 'trip-picker':openModal('tripPicker');break;
case 'select-trip':{let t=state.trips.find(x=>x.id===id);if(t)chooseTrip(t);break;}
case 'delete-trip':{let t=state.trips.find(x=>x.id===id);if(!t||t.owner_id!==state.user?.id)throw Error('Only the trip owner can delete it.');openModal('deleteTrip',{id:t.id});break;}
case 'new-trip':openModal('newTrip');break;
case 'edit-trip':openModal('editTrip');break;
case 'new-stop':openModal('addToDay');break;
case 'new-custom-stop':state.addSelection=null;openModal('stop',{schedule_date:state.day});break;
case 'add-kind':state.addKind=v;state.googleResults=[];render();break;
case 'add-clear-search':state.addSearch='';state.googleResults=[];render();setTimeout(()=>$('#add-day-search')?.focus(),0);break;
case 'add-google-search':await searchAddGoogle();break;
case 'add-nearby':await searchAddGoogle({nearby:true});break;
case 'around-stop':{const stop=state.schedule.find(x=>Number(x.id)===id);if(stop)await findAroundStop(stop);break;}
case 'starter-suggest':await findStarterSuggestions();break;
case 'between-route':await findBetweenRoute();break;
case 'around-add':{const result=state.aroundResults[Number(el.dataset.index)];if(result)await addSelectionToDay({...result,__source:result.__source||'google',__kind:'place'});break;}
case 'around-save':{const result=state.aroundResults[Number(el.dataset.index)];if(result)await saveSelectionForLater({...result,__source:result.__source||'google',__kind:'place'});break;}
case 'add-preview':{let selection=null;const source=el.dataset.source||'catalog',kind=el.dataset.kind||'place';if(source==='google'){selection=state.googleResults[Number(el.dataset.index)];if(selection)selection={...selection,__source:'google',__kind:kind};}else{selection=(kind==='food'?state.restaurants:state.places).find(x=>Number(x.id)===id);if(selection)selection={...selection,__source:'catalog',__kind:kind};}if(selection){state.addSelection=selection;render();}break;}
case 'add-preview-back':state.addSelection=null;render();setTimeout(()=>$('#add-day-search')?.focus(),0);break;
case 'add-selection-day':await addSelectionToDay(state.addSelection);break;
case 'save-selection':await saveSelectionForLater(state.addSelection);break;
case 'move-stop':await moveDayStop(id,Number(v));break;
case 'edit-stop':openModal('stop',state.schedule.find(x=>x.id===id));break;
case 'new-booking':openModal('booking');break;
case 'edit-booking':openModal('booking',state.bookings.find(x=>x.id===id));break;
case 'new-expense':openModal('expense');break;
case 'edit-expense':openModal('expense',state.expenses.find(x=>x.id===id));break;
case 'add-catalog':openModal('catalog');break;
case 'google-from-explore':{let q=state.search.trim();openModal('catalog');if(state.kind==='food')$('#catalog-kind').value='food';if(q.length>=3){$('#google-search-form input').value=q;searchGoogle($('#google-search-form'));}else $('#google-search-form input').focus();break;}
case 'profile':openModal('profile');break;
case 'photo-review':window.location.href='review.html';break;
case 'photo-review-approve':await reviewPlacePhoto(id,'approve');break;
case 'photo-review-reject':await reviewPlacePhoto(id,'reject');break;
case 'photo-review-missing':await reviewPlacePhoto(id,'missing');break;
case 'signout':{let r=await sb.auth.signOut();if(r.error)throw r.error;state.modal=null;break;}
case 'close-modal':state.modal=null;render();break;
case 'assistant':state.assistantOpen=true;state.mobileMenu=false;state.modal=null;render();break;
case 'assistant-close':state.assistantOpen=false;render();break;
case 'schedule-catalog':{let kind=el.dataset.kind,src=(kind==='food'?state.restaurants:state.places).find(x=>x.id===id);if(!src)break;openModal('addToDay');state.addSelection={...src,__source:'catalog',__kind:kind};render();break;}
case 'save-catalog':{let kind=el.dataset.kind,isFood=kind==='food',table=isFood?'trip_restaurants':'trip_places',column=isFood?'restaurant_id':'place_id',saved=(isFood?state.savedFood:state.savedPlaces).find(x=>x[column]===id);if(saved){let r=await sb.from(table).delete().eq('id',saved.id).eq('trip_id',state.trip.id);if(r.error)throw r.error;toast('Removed from saved.');}else{await saveRow(table,{trip_id:state.trip.id,[column]:id});toast('Saved to your trip.');}await loadTripData();break;}
case 'delete-stop':case 'delete-booking':case 'delete-expense':state.modal={type:'confirm',target:a,id,message:`Delete this ${a.split('-')[1]}? This cannot be undone.`};render();break;
case 'confirm-delete':{const target=state.modal.target,table=target==='delete-stop'?'schedule':target==='delete-booking'?'bookings':'trip_expenses';let r=await sb.from(table).delete().eq('id',state.modal.id).eq('trip_id',state.trip.id);if(r.error)throw r.error;state.modal=null;toast('Removed.');await loadTripData();break;}
case 'assist-proposal':{let message=state.assistant[Number(el.dataset.message)],item=message?.actions?.[Number(el.dataset.index)];if(!item)break;if(item.kind==='map'){if(/^https:\/\//.test(item.url))window.open(item.url,'_blank','noopener,noreferrer');break;}if(!item.proposal_id)break;if(!confirm(item.confirmation_text||`Apply “${item.title||item.label}” to your trip?`))break;let {data,error}=await sb.functions.invoke('travel-assist',{body:{action:'apply',trip_id:state.trip.id,proposal_id:item.proposal_id}});if(error||data?.error)throw Error(data?.error||error?.message);item.label='Applied';item.proposal_id=null;state.assistant.push({role:'assistant',text:data.reply||'Done — I updated your trip.'});await loadTripData();toast('Trip updated.');break;}
} }catch(e){toast(e.message||'Something went wrong.',true);}}
async function askAssist(form){let input=form.elements.message,question=input.value.trim();if(!question||state.assistantBusy)return;state.assistant.push({role:'user',text:question});state.assistantBusy=true;render();try{let {data,error}=await sb.functions.invoke('travel-assist',{body:{trip_id:state.trip.id,message:question,thread_id:state.threadId,selected_date:state.day,entry_point:state.tab,context:{selected_date:state.day,screen:state.tab}}});if(error||data?.error)throw Error(data?.error||error.message);state.threadId=data.thread_id||state.threadId;state.assistant.push({role:'assistant',text:data.reply||data.message||'I’m here to help.',actions:data.actions||[]});}catch(e){state.assistant.push({role:'assistant',text:`I couldn’t reach Travel Assist just now. ${e.message||'Try again in a moment.'}`});}finally{state.assistantBusy=false;render();$('#assist-form input')?.focus();}}
document.addEventListener('click',e=>{let el=e.target.closest('[data-action]');if(el){if(el.classList.contains('overlay')&&e.target!==el)return;e.preventDefault();action(el.dataset.action,el);}});
document.addEventListener('submit',e=>{if(e.target.id==='assist-form'){e.preventDefault();askAssist(e.target);}else if(e.target.id==='google-search-form'){e.preventDefault();searchGoogle(e.target);}else if(e.target.id==='add-search-form'){e.preventDefault();searchAddGoogle();}else if(['auth-form','trip-form','delete-trip-form','stop-form','booking-form','expense-form','catalog-form','password-form'].includes(e.target.id)){e.preventDefault();handleForm(e.target);}});
document.addEventListener('change',e=>{if(e.target.dataset.foodSelect){if(e.target.dataset.foodSelect==='area')state.foodArea=e.target.value;else state.foodCuisine=e.target.value;render();}});
document.addEventListener('input',e=>{if(e.target.id==='add-day-search'){let at=e.target.selectionStart;state.addSearch=e.target.value;state.googleResults=[];render();let input=$('#add-day-search');input?.focus();input?.setSelectionRange(at,at);return;}if(e.target.id==='food-search'){let at=e.target.selectionStart;state.foodSearch=e.target.value;render();let input=$('#food-search');input?.focus();input?.setSelectionRange(at,at);return;}if(e.target.id==='catalog-search'){state.search=e.target.value;let term=state.search.toLowerCase(),items=[...state.places.map(x=>({...x,__kind:'place'})),...state.restaurants.map(x=>({...x,__kind:'food'}))].filter(x=>x.status==='active'&&inTripCountry(x)&&(!term||[x.name,x.city,x.area,x.cuisine,x.place_type,x.country].some(v=>String(v||'').toLowerCase().includes(term)))&&(state.kind==='all'||x.__kind===state.kind));let el=$('#catalog-results');if(el){el.innerHTML=items.slice(0,120).map(x=>catalogItem(x,x.__kind)).join('')||'<div class="empty-list"><h3>No matches yet</h3><p>Try another search.</p></div>';drawIcons();hydratePlacePhotos();}let n=$('.filter-row span');if(n)n.textContent=`${items.length} discoveries`;}});
const appRoot=document.getElementById('app');
if(appRoot){
  appRoot.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f6f4ef;color:#5b4c50"><div style="text-align:center"><strong style="display:block;font-size:20px;margin-bottom:8px">Travelite</strong><span style="font-size:12px;opacity:.7">Loading your journey…</span></div></div>';
}

window.addEventListener('error',event=>{
  console.error('Travelite runtime error',event.error||event.message);
  if(appRoot && !appRoot.innerHTML.trim()){
    appRoot.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif"><div style="max-width:420px;text-align:center"><h2>Travelite could not start.</h2><p>Please refresh the page. If this keeps happening, the app will show an error instead of a blank screen.</p></div></div>';
  }
});

init();
