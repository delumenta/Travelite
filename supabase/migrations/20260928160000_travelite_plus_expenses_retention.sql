-- Travelite+ foundation: active Plus mode, expenses with receipt retention
-- Created 2026-09-28

alter table public.trips
  add column if not exists trip_mode text not null default 'plus'
    check (trip_mode in ('basic','standard','plus')),
  add column if not exists paid_entitlement boolean not null default false,
  add column if not exists retention_exempt boolean not null default false;

alter table public.trip_expenses
  add column if not exists receipt_path text,
  add column if not exists receipt_uploaded_at timestamptz,
  add column if not exists receipt_deleted_at timestamptz;

create index if not exists trips_trip_mode_idx on public.trips(trip_mode);
create index if not exists trip_expenses_receipt_retention_idx
  on public.trip_expenses(receipt_uploaded_at, receipt_deleted_at);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload their own receipts" on storage.objects;
create policy "Users can upload their own receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can view their own receipts" on storage.objects;
create policy "Users can view their own receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own receipts" on storage.objects;
create policy "Users can delete their own receipts"
on storage.objects for delete to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
