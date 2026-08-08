-- Fix naming error from the previous migration: `date` in the source JSON
-- data (app/pages/(community)/wanted-cards/index.vue) is populated for the
-- vast majority of *unfound* rows too (e.g. ids 3, 9-45 all have a date with
-- found: false) — it's the date the request was logged, not the date the
-- card was found. `found_at` implied the wrong semantics.
alter table public.pauperwave_wanted_cards
  rename column found_at to requested_at;
