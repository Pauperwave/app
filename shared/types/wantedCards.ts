// shared\types\wantedCards.ts

// Shared by useWantedCardsMutations.ts and server/api/wanted-cards/{create,[id]/update}.post.ts:
// the client payload and the server body are the same shape (thin pass-through to Supabase).

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

// The card name is fixed (renaming means a different request) but the printing can change:
// scryfallUrl and the Scryfall data derived from it change together.
// cardtraderPrice is excluded: it only changes through its own refresh endpoint.
export type WantedCardEditsPayload = Omit<NewWantedCardPayload, 'cardName'>
