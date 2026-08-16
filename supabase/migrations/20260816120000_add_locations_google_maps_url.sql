-- supabase\migrations\20260816120000_add_locations_google_maps_url.sql
-- Adds an optional, precise Google Maps place link per location — the
-- existing googleMapsUrl() util only ever builds a generic
-- /maps/search/?query=<address> URL from the address string, which doesn't
-- reliably resolve to the actual venue (user report, 2026-08-16: "V.le
-- Trento, 47/49" isn't accurate for Smart Lab). When set, this takes
-- priority over the address-search fallback; null for every existing
-- location until backfilled.
alter table public.locations
  add column google_maps_url text;
