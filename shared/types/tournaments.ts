// shared\types\tournaments.ts

// Shared by app/components/tournaments/list/AddModal.vue and
// server/api/tournaments/create.post.ts — same convention as
// shared/types/transactions.ts (a thin pass-through to Supabase).
export interface NewTournamentPayload {
  name: string
  status: string
  formatUuid: string
  locationUuid: string | null
  organizerUuid: string | null
  leagueUuid: string | null
  eventUuid: string | null
  startsAt: string
  endsAt: string | null
  roundCount: number | null
  entryFee: number | null
  description: string | null
  prizes: string | null
  companionCode: string | null
  imageUrl: string | null
  // Scryfall art_crop attribution, see migration 20260820120000 — both null
  // whenever imageUrl is unset or wasn't picked via MagicCardArtPicker.vue.
  imageCardName: string | null
  imageCardArtist: string | null
}
