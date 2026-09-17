-- Borrowed-deck tracking (user request, 2026-09-17: restore league's
-- commander_decks.is_borrowed/lender_id feature, adapted to this app's
-- uuid-based player identity) — lets a deck's card be attributed to its
-- owner while noting it's currently on loan from another player.
alter table public.commander_decks
  add column is_borrowed boolean not null default false,
  add column lender_uuid uuid references public.players(uuid);
