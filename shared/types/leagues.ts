// shared\types\leagues.ts

// Shared by leagues/list/AddModal.vue and server/api/leagues/create.post.ts (thin pass-through to
// Supabase). No startsAt/endsAt: a league's dates are derived from its tournaments by
// server/utils/leagueDates.ts.
export interface NewLeaguePayload {
  name: string
  status: string
  rulesetUuid: string | null
  imageUrl: string | null
  // Scryfall art_crop attribution: null unless imageUrl was picked via MagicCardArtPicker.vue
  imageCardName: string | null
  imageCardArtist: string | null
}
