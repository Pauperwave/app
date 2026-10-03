-- supabase\migrations\20261003120000_event_details_and_partners.sql
-- What an event page shows beyond its tournaments, modeled on Radio Atog 2026 (user request,
-- 2026-10-03, plan docs/plans/2026-10-02-event-page.md step 4). An event is a folder of tournaments:
-- these are its own, all optional.
-- - tagline / edition ("Eat, Drink, Combat, Repeat", 6th edition), description, practical notes
--   (parking, food...), tickets link + the day they go on sale, whether membership is required (+ link).
-- - event_partners: any number of partners per event (collaborators, sponsors), shown in order.
alter table public.events
  add column tagline text,
  add column edition integer,
  add column description text,
  add column practical_notes text,
  add column tickets_url text,
  add column tickets_on_sale_on date,
  add column membership_required boolean not null default false,
  add column membership_url text;

alter table public.events
  add constraint ck_events_edition check (edition > 0);

create table public.event_partners (
  id bigint generated always as identity primary key,
  uuid uuid not null default gen_random_uuid() unique,
  event_uuid uuid not null references public.events (uuid) on delete cascade,
  name text not null,
  role text not null,
  logo_url text,
  link_url text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_event_partners_role check (role in ('collaborator', 'sponsor'))
);

create index idx_event_partners_event_uuid on public.event_partners (event_uuid);

create trigger set_event_partners_updated_at
  before update on public.event_partners
  for each row
  execute function public.set_updated_at();

alter table public.event_partners enable row level security;

-- Same shape as events itself: public to read (the event page and calendar show them), writes for
-- organizers and above.
create policy public_read on public.event_partners
  for select
  using (true);

create policy management_full_access on public.event_partners
  for all
  using (public.has_management_permissions(auth.uid()))
  with check (public.has_management_permissions(auth.uid()));
