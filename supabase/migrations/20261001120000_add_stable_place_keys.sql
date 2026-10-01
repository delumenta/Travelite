-- Stable POI identity for planner intelligence and future curation.
-- Numeric places.id remains the FK, but migrations/seeds should resolve POIs by place_key.

alter table public.places
  add column if not exists place_key text;

update public.places
set place_key = lower(
  regexp_replace(
    regexp_replace(coalesce(city, '') || '-' || name, '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-|-$)', '', 'g'
  )
)
where place_key is null;

create unique index if not exists places_place_key_uidx
  on public.places(place_key)
  where place_key is not null;

comment on column public.places.place_key is
  'Stable application identity for migrations/seeds. Do not change when display name or numeric id changes.';

create or replace function public.set_place_key_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.place_key is null then
    new.place_key := lower(
      regexp_replace(
        regexp_replace(coalesce(new.city, '') || '-' || new.name, '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
      )
    );
  end if;
  return new;
end
$$;

drop trigger if exists trg_set_place_key_on_insert on public.places;
create trigger trg_set_place_key_on_insert
before insert on public.places
for each row execute function public.set_place_key_on_insert();

-- Example for all future planner curation:
-- update public.place_planning_profiles p
-- set crowd_sensitivity = 5
-- from public.places x
-- where p.place_id = x.id
--   and x.place_key = 'kyoto-fushimi-inari-taisha';
