// app\composables\leagues\useLeaguesMutations.ts
import type { NewLeaguePayload } from '#shared/types/leagues'

export function useLeaguesMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: LEAGUES_KEY })

  // Same "every write goes through a server/api endpoint" convention as
  // useTournamentsMutations.ts/useEventsMutations.ts.
  const createLeague = useMutation({
    mutation: (league: NewLeaguePayload) =>
      $fetch('/api/leagues/create', { method: 'POST', body: league }),
    onSettled: invalidate
  })

  return { createLeague }
}
