-- Renames event_locations to locations (generic — not events-specific, per
-- user request 2026-08-15) and adds the columns the events/tournaments UI
-- needs that the real schema never had (it's been running entirely on mock
-- data from server/api/{events,tournaments,leagues}.ts until now, all three
-- tables were empty).

alter table public.event_locations rename to locations;
alter table public.locations rename constraint pk_event_locations_pkey to pk_locations_pkey;

alter table public.tournaments
  add column location_uuid uuid references public.locations(uuid),
  add column organizer_uuid uuid references public.organizations(uuid),
  add column entry_fee numeric,
  add column prizes text,
  add column image_url text,
  add column contact_name text,
  add column contact_phone text,
  add column companion_code text,
  add column registered_players int,
  add column participant_names text[] not null default '{}';

alter table public.events
  add column image_url text;
