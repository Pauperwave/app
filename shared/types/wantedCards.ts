// shared\types\wantedCards.ts

// Shared by app/composables/wantedCards/useWantedCardsMutations.ts and
// server/api/wanted-cards/{create,[id]/update}.post.ts (fallow dupes,
// 2026-08-12): the client mutation payload and the server body it's read into
// are the same shape by construction — the endpoint is a thin pass-through
// to Supabase, not an independent contract.

export interface NewWantedCardPayload {
  playerAssociateUuid: string
  cardName: string
  scryfallUrl: string
  scryfallId: string
  setCode: string
  manaCost: string
  colorIdentity: string[]
  typeLine: string | null
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
export type WantedCardEditsPayload = Omit<NewWantedCardPayload, 'cardName'>
