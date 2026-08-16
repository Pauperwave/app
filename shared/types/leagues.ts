// shared\types\leagues.ts

// Shared by app/components/leagues/list/AddModal.vue and
// server/api/leagues/create.post.ts — same convention as
// shared/types/tournaments.ts (a thin pass-through to Supabase).
export interface NewLeaguePayload {
  name: string
  status: string
  rulesetUuid: string | null
  startsAt: string | null
  endsAt: string | null
}
