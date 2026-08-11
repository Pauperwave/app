// app\composables\wantedCards\useWantedCardsMutations.ts
import type { WantedCardStatus } from '~/types'
import type { NewWantedCardPayload, WantedCardEditsPayload } from '#shared/types/wantedCards'

export function useWantedCardsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: WANTED_CARDS_KEY })

  // Every write goes through a server/api endpoint holding the service-role key —
  // that endpoint is the authorization boundary (see server/utils/serverAuth.ts),
  // no longer the RLS policies evaluated from the client.
  const createWantedCard = useMutation({
    mutation: (card: NewWantedCardPayload) =>
      $fetch('/api/wanted-cards/create', { method: 'POST', body: card }),
    onSettled: invalidate
  })

  const updateWantedCard = useMutation({
    mutation: ({ id, edits }: { id: number, edits: WantedCardEditsPayload }) =>
      $fetch(`/api/wanted-cards/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  const setStatus = useMutation({
    mutation: ({ id, status }: { id: number, status: WantedCardStatus }) =>
      $fetch(`/api/wanted-cards/${id}/status`, { method: 'POST', body: { status } }),
    onSettled: invalidate
  })

  const deleteWantedCard = useMutation({
    mutation: (id: number) =>
      $fetch(`/api/wanted-cards/${id}/delete`, { method: 'POST' }),
    onSettled: invalidate
  })

  const refreshPrices = useMutation({
    mutation: (id: number) =>
      $fetch(`/api/wanted-cards/${id}/refresh-prices`, { method: 'POST' }),
    onSettled: invalidate
  })

  return { createWantedCard, updateWantedCard, setStatus, deleteWantedCard, refreshPrices }
}
