// app\composables\useWantedCardsMutations.ts
import type { WantedCardStatus } from '~/types'

export interface NewWantedCard {
  playerAssociateUuid: string
  cardName: string
  scryfallUrl: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

// Il nome carta resta fisso (cambiarlo equivale a creare una richiesta
// diversa), ma l'edizione/stampa esatta è modificabile — scryfallUrl e i
// dati Scryfall che ne derivano (manaCost/colorIdentity/cmc/imageUrl/price)
// cambiano insieme quando si sceglie un'altra stampa nel picker.
export interface WantedCardEdits {
  playerAssociateUuid: string
  scryfallUrl: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  price: number | null
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

export function useWantedCardsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: WANTED_CARDS_KEY })

  // Ogni scrittura passa da un endpoint server/api con service-role key —
  // quell'endpoint è il boundary di autorizzazione (vedi
  // server/utils/serverAuth.ts), non più le policy RLS lette dal client.
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

  return { createWantedCard, updateWantedCard, setStatus, deleteWantedCard }
}
