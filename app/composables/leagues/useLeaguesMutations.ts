// app\composables\leagues\useLeaguesMutations.ts
import type { LeagueStatus } from '~/types'
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

  const updateLeague = useMutation({
    mutation: ({ id, edits }: { id: number, edits: NewLeaguePayload }) =>
      $fetch(`/api/leagues/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  const setStatus = useMutation({
    mutation: ({ id, status }: { id: number, status: LeagueStatus }) =>
      $fetch(`/api/leagues/${id}/status`, { method: 'POST', body: { status } }),
    onSettled: invalidate
  })

  const setRuleset = useMutation({
    mutation: ({ id, rulesetUuid }: { id: number, rulesetUuid: string | null }) =>
      $fetch(`/api/leagues/${id}/ruleset`, { method: 'POST', body: { rulesetUuid } }),
    onSettled: invalidate
  })

  const deleteLeague = useMutation({
    mutation: (id: number) =>
      $fetch(`/api/leagues/${id}/delete`, { method: 'POST' }),
    onSettled: invalidate
  })

  return {
    createLeague, updateLeague, setStatus, setRuleset, deleteLeague
  }
}
