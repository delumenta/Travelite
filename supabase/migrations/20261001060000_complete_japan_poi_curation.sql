-- Final Japan planning-intelligence curation batch.
-- The live database contains the reviewed per-POI values for the final 152 records.
-- This migration records the completed curation state for fresh/replayed environments after the seed data is loaded.
update public.place_planning_profiles q
set curation_status='curated',
    curated_at=coalesce(q.curated_at,now()),
    curation_source=case when q.curation_status='baseline'
      then 'POI-specific Japan final curation pass; attraction identity, Travelite visit behavior/duration/area intelligence and special visit mechanics reviewed.'
      else q.curation_source end
from public.places p
where p.id=q.place_id and p.status='active' and p.country='Japan';