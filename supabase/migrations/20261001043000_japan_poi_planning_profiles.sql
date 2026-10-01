-- Planner effort intelligence for Japan POIs.
-- Durable POI facts live in Supabase; day effort is calculated at runtime.

alter table public.place_planning_profiles
  add column if not exists physical_intensity smallint not null default 1 check (physical_intensity between 0 and 5),
  add column if not exists terrain_intensity smallint not null default 0 check (terrain_intensity between 0 and 5),
  add column if not exists stairs_intensity smallint not null default 0 check (stairs_intensity between 0 and 5);

insert into public.place_planning_profiles
(place_id,typical_duration_min,minimum_useful_time_min,importance,detour_worthiness,filler_score,time_sensitivity,crowd_sensitivity,area_cluster,anchor_place,move_to_another_day,scheduling_notes,physical_intensity,terrain_intensity,stairs_intensity,updated_at)
select p.id,
coalesce(case when p.estimated_minutes_min is not null and p.estimated_minutes_max is not null then round((p.estimated_minutes_min+p.estimated_minutes_max)/2.0)::int when p.estimated_minutes_max is not null then p.estimated_minutes_max when p.estimated_minutes_min is not null then p.estimated_minutes_min end,
case p.place_type when 'museum' then 90 when 'aquarium' then 150 when 'castle' then 90 when 'walking_route' then 90 when 'nature' then 90 when 'park' then 60 when 'garden' then 60 when 'temple' then 60 when 'shrine' then 45 when 'market' then 75 when 'shopping_district' then 120 when 'shopping_street' then 90 when 'historic_district' then 90 when 'historic_street' then 75 when 'historic_village' then 120 when 'viewpoint' then 45 when 'activity' then 120 when 'experience' then 120 when 'scenic_drive' then 120 when 'onsen' then 90 when 'onsen_town' then 120 when 'station' then 20 when 'hotel' then 30 else 60 end),
greatest(15,least(coalesce(p.estimated_minutes_min,case p.place_type when 'aquarium' then 90 when 'shopping_district' then 60 when 'historic_village' then 60 when 'activity' then 60 when 'experience' then 60 when 'scenic_drive' then 60 when 'museum' then 45 when 'nature' then 45 when 'walking_route' then 45 when 'temple' then 30 when 'shrine' then 20 else 30 end),180)),
case p.prominence when 'major' then 90 when 'notable' then 70 when 'supporting' then 35 when 'local_special_interest' then 45 else 55 end,
case p.prominence when 'major' then 85 when 'notable' then 65 when 'supporting' then 30 when 'local_special_interest' then 45 else 50 end,
case when p.visit_behavior in ('quick_stop','quick_stop_route','supporting') then 85 when p.prominence='major' then 20 when p.prominence='notable' then 40 else 60 end,
least(5,(case p.place_type when 'viewpoint' then 3 when 'market' then 3 when 'scenic_drive' then 3 when 'nature' then 2 when 'garden' then 2 when 'park' then 2 when 'temple' then 2 when 'shrine' then 2 when 'historic_district' then 2 when 'shopping_district' then 2 when 'shopping_street' then 2 else 1 end)+case when coalesce(p.visit_behavior,'') like 'fixed%' then 2 else 0 end+case when lower(p.name) ~ '(sunset|sunrise|night|illumination|sky|observatory)' then 1 else 0 end),
least(5,(case p.place_type when 'market' then 4 when 'temple' then 3 when 'shrine' then 3 when 'historic_district' then 3 when 'historic_street' then 3 when 'shopping_district' then 3 when 'aquarium' then 3 when 'museum' then 2 when 'viewpoint' then 2 when 'nature' then 2 when 'garden' then 2 else 1 end)+case when p.prominence='major' then 1 else 0 end),
coalesce(nullif(p.region,''),nullif(p.area,''),nullif(p.city,'')),
coalesce((p.prominence='major' or p.visit_behavior in ('fixed_destination','fixed_activity','fixed_route_activity','hike_destination')),false),
coalesce((p.prominence is distinct from 'major' and coalesce(p.visit_behavior,'') not like 'fixed%'),true),
'Generated baseline planning profile from catalog type, prominence, visit behavior, duration and geography. Special timing windows can override this baseline.',
least(5,(case p.place_type when 'walking_route' then 3 when 'nature' then 3 when 'park' then 2 when 'garden' then 2 when 'historic_district' then 2 when 'historic_street' then 2 when 'temple' then 2 when 'shrine' then 2 when 'castle' then 2 when 'market' then 2 else 1 end)+case when lower(p.name) ~ '(mount|mt\\.? |mountain|hill|hike|trail|falls|waterfall)' then 1 else 0 end),
least(5,(case p.place_type when 'viewpoint' then 2 when 'nature' then 2 when 'walking_route' then 2 when 'castle' then 1 else 0 end)+case when lower(p.name) ~ '(mount|mt\\.? |mountain|hill|hike|trail|falls|waterfall)' then 2 else 0 end),
least(5,(case p.place_type when 'temple' then 1 when 'shrine' then 1 when 'castle' then 2 when 'viewpoint' then 1 else 0 end)+case when lower(p.name) ~ '(mount|mt\\.? |mountain|hill|hike|trail)' then 1 else 0 end),
now()
from public.places p
where p.status='active' and p.country='Japan'
and not exists(select 1 from public.place_planning_profiles q where q.place_id=p.id);

-- Existing hand-curated rows are preserved; only effort fields are raised for obvious hill/hike POIs.
update public.place_planning_profiles q set
physical_intensity=greatest(q.physical_intensity,case when lower(p.name) ~ '(mount|mt\\.? |mountain|hill|hike|trail|falls|waterfall)' then 3 else q.physical_intensity end),
terrain_intensity=greatest(q.terrain_intensity,case when lower(p.name) ~ '(mount|mt\\.? |mountain|hill|hike|trail|falls|waterfall)' then 3 else q.terrain_intensity end),
stairs_intensity=greatest(q.stairs_intensity,case when lower(p.name) ~ '(mount|mt\\.? |mountain|hill|hike|trail)' then 2 else q.stairs_intensity end),
updated_at=now()
from public.places p
where p.id=q.place_id and p.status='active' and p.country='Japan';
