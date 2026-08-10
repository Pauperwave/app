// app\composables\wantedCards\useWantedCardsMutations.ts
import type { WantedCardStatus } from '~/types'

export interface NewWantedCard {
  playerAssociateUuid: string
  cardName: string
  scryfallUrl: string
  scryfallId: string
  setCode: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  cardmarketPrice: number | null
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

// The card name is fixed (changing it amounts to creating a different request), but
// the exact edition/printing can be edited — scryfallUrl and the Scryfall data
// derived from it (manaCost/colorIdentity/cmc/imageUrl/cardmarketPrice) change
// together when another printing is picked. cardtraderPrice is not here: it is only
// updated through a refresh (its own endpoint), never from the edit form.
export interface WantedCardEdits {
  playerAssociateUuid: string
  scryfallUrl: string
  scryfallId: string
  setCode: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  cardmarketPrice: number | null
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

export function useWantedCardsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: WANTED_CARDS_KEY })

  // Every write goes through a server/api endpoint holding the service-role key —
  // that endpoint is the authorization boundary (see server/utils/serverAuth.ts),
  // no longer the RLS policies evaluated from the client.
  const createWantedCard = useMutation({
    mutation: (card: NewWantedCard) =>
      $fetch('/api/wanted-cards/create', { method: 'POST', body: card }),
    onSettled: invalidate
  })

  const updateWantedCard = useMutation({
    mutation: ({ id, edits }: { id: number, edits: WantedCardEdits }) =>
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
