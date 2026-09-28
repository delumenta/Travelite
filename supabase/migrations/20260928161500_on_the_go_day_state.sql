-- On-the-go support for today's live day
alter table public.schedule
  add column if not exists completed_at timestamptz,
  add column if not exists skipped_at timestamptz,
  add column if not exists is_temporary boolean not null default false,
  add column if not exists source text not null default 'planned';

alter table public.trip_expenses
  add column if not exists schedule_id uuid references public.schedule(id) on delete set null,
  add column if not exists is_on_the_go boolean not null default false;

create index if not exists schedule_live_day_idx on public.schedule(trip_id, schedule_date, completed_at, skipped_at);
create index if not exists trip_expenses_schedule_idx on public.trip_expenses(schedule_id);