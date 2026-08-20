// shared\types\leagues.ts

// Shared by app/components/leagues/list/AddModal.vue and
// server/api/leagues/create.post.ts — same convention as
// shared/types/tournaments.ts (a thin pass-through to Supabase).
// No startsAt/endsAt here (2026-08-16 ADR, docs/PROGRESS.md): a league's
// dates are derived from its tournaments' starts_at/ends_at by
// server/utils/leagueDates.ts, never set directly.
export interface NewLeaguePayload {
  name: string
  status: string
  rulesetUuid: string | null
  imageUrl: string | null
  // Scryfall art_crop attribution, see migration 20260820120000 — both null
  // whenever imageUrl is unset or wasn't picked via MagicCardArtPicker.vue.
  imageCardName: string | null
  imageCardArtist: string | null
}
