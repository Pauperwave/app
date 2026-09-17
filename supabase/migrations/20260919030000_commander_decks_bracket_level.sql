-- Commander power-level "Bracket" rating (user request, 2026-09-16: copy
-- league's deck/commander/bracket features, adapted to this app) — ported
-- from league's commander_decks.bracket_level. Nullable: most decks won't
-- have a bracket set until an organizer/player picks one via
-- BracketPickerModal.vue.
alter table public.commander_decks
  add column bracket_level smallint
    constraint ck_commander_decks_bracket_level_range
    check (bracket_level is null or (bracket_level >= 1 and bracket_level <= 5));
