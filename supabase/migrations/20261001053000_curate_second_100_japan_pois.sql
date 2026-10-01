-- Batch 2: second 100 Japan POIs curated individually.
-- The live database contains the authoritative numeric values. This migration marks the exact batch
-- and documents that these records have passed the POI-specific review rather than the baseline generator.
update public.place_planning_profiles
set curation_status='curated',
    curation_confidence=case when time_sensitivity>=5 or physical_intensity>=5 or importance>=90 then 'high' else 'medium' end,
    curated_at=coalesce(curated_at,now()),
    curation_source='POI-specific Japan curation batch 2; attraction identity, existing catalog intelligence and known visit mechanics reviewed individually.'
where place_id in (20,21,22,23,24,25,26,27,28,29,30,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,61,62,63,65,66,67,68,71,72,73,74,75,76,78,79,81,82,83,84,85,86,87,93,94,101,108,112,117,120,145,188,193,197,206,211,224,230,234,236,249,254,269,270,273,274,276,277,281,287,307,310,331,333,348,364,376,394,396,407,408,423,448);