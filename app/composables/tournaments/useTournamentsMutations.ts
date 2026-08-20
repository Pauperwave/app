// app\composables\tournaments\useTournamentsMutations.ts
import type { TournamentStatus } from '~/types'
import type { NewTournamentPayload } from '#shared/types/tournaments'

interface SetTournamentImageParams {
  id: number
  imageUrl: string | null
  imageCardName: string | null
  imageCardArtist: string | null
}

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

  const updateTournament = useMutation({
    mutation: ({ id, edits }: { id: number, edits: NewTournamentPayload }) =>
      $fetch(`/api/tournaments/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  const setStatus = useMutation({
    mutation: ({ id, status }: { id: number, status: TournamentStatus }) =>
      $fetch(`/api/tournaments/${id}/status`, { method: 'POST', body: { status } }),
    onSettled: invalidate
  })

  const setImage = useMutation({
    mutation: ({ id, ...body }: SetTournamentImageParams) =>
      $fetch(`/api/tournaments/${id}/image`, { method: 'POST', body }),
    onSettled: invalidate
  })

  const setEntryFee = useMutation({
    mutation: ({ id, entryFee }: { id: number, entryFee: number }) =>
      $fetch(`/api/tournaments/${id}/entry-fee`, { method: 'POST', body: { entryFee } }),
    onSettled: invalidate
  })

  const deleteTournament = useMutation({
    mutation: (id: number) =>
      $fetch(`/api/tournaments/${id}/delete`, { method: 'POST' }),
    onSettled: invalidate
  })

  return {
    createTournament, updateTournament, setStatus, setImage, setEntryFee, deleteTournament
  }
}
