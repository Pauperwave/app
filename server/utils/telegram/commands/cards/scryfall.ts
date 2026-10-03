// server\utils\telegram\commands\cards\scryfall.ts
import type { ScryfallCard } from '#shared/types/scryfall'
import type { ScryfallGetter } from '#shared/utils/wantedCards/decklistLookup'
import { frontImageUris, parseScryfallPrice } from '#shared/utils/wantedCards/wantedCardRow'
import type { PricePrinting } from './priceCard'

// Scryfall access shared by the card commands (/prezzo, the add button, the list import)

const SCRYFALL_API = 'https://api.scryfall.com'
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot cards; contact: emanuelenardi.dev@gmail.com)'

export function scryfallGet<T>(path: string, query?: Record<string, string>) {
  return $fetch<T>(`${SCRYFALL_API}${path}`, {
    query,
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })
}

// Scryfall answers 404 for an unknown or ambiguous name: that is "not found", not an error
export async function scryfallOrNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) return null
    throw err
  }
}

// The getter the shared lookup (decklistLookup.ts) runs on
export const scryfallLookupGetter: ScryfallGetter = (path, query) => scryfallOrNull(
  scryfallGet(path, query)
)

export function toPrinting(card: ScryfallCard): PricePrinting {
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    finishes: card.finishes ?? [],
    cardmarketPrice: parseScryfallPrice(card.prices?.eur),
    cardmarketFoilPrice: parseScryfallPrice(card.prices?.eur_foil),
    cardmarketUrl: card.purchase_uris?.cardmarket ?? null,
    scryfallUrl: card.scryfall_uri,
    thumbnailUrl: frontImageUris(card)?.small ?? null,
    imageUrl: frontImageUris(card)?.normal ?? null
  }
}

export async function fetchScryfallCard(scryfallId: string): Promise<ScryfallCard | null> {
  return scryfallOrNull(scryfallGet<ScryfallCard>(`/cards/${scryfallId}`))
}
