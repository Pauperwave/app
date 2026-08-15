// app\composables\tournaments\useTournamentsMutations.ts
import type { NewTournamentPayload } from '#shared/types/tournaments'

export function useTournamentsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })

  // Same "every write goes through a server/api endpoint" convention as
  // useWantedCardsMutations.ts — the BFF endpoint (requireManagementPermission)
  // is the authorization boundary, not RLS evaluated from the client.
  const createTournament = useMutation({
    mutation: (tournament: NewTournamentPayload) =>
      $fetch('/api/tournaments/create', { method: 'POST', body: tournament }),
    onSettled: invalidate
  })

  return { createTournament }
}
