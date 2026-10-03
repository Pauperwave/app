// shared\types\tournaments.ts

// Shared by tournaments/list/AddModal.vue and server/api/tournaments/create.post.ts (thin
// pass-through to Supabase).
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
  roundDurationMinutes: number | null
  entryFee: number | null
  // Optional extras: the non-members' price (entryFee is the members'), the player cap,
  // whether decklists are public or secret, and when on-site registration opens.
  entryFeeNonMember: number | null
  maxEntrants: number | null
  decklistVisibility: 'public' | 'secret' | null
  registrationAt: string | null
  description: string | null
  prizes: string | null
  companionCode: string | null
  imageUrl: string | null
  // Scryfall art_crop attribution: null unless imageUrl was picked via MagicCardArtPicker.vue
  imageCardName: string | null
  imageCardArtist: string | null
  telegramNotificationsEnabled: boolean
  // Test tournament, super_admin only: the server rejects the request if it's present for anyone
  // else, so the form leaves it undefined unless the user is allowed to set it.
  isTest?: boolean
}
