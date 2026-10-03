// server\utils\telegram\commands\cards\scryfall.ts
import type { PricePrinting } from './priceCard'

// Scryfall access shared by the card commands (/prezzo and the "cercate" button)

const SCRYFALL_API = 'https://api.scryfall.com'
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (Telegram bot cards; contact: emanuelenardi.dev@gmail.com)'

interface ScryfallImageUris {
  small?: string
  normal?: string
  large?: string
}

interface ScryfallFace {
  mana_cost?: string
  image_uris?: ScryfallImageUris
}

export interface ScryfallCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  finishes?: string[]
  prices?: { eur?: string | null, eur_foil?: string | null }
  purchase_uris?: { cardmarket?: string }
  scryfall_uri: string
  mana_cost?: string
  color_identity?: string[]
  type_line?: string
  cmc?: number
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallFace[]
}

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

export function toPrice(raw: string | null | undefined): number | null {
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

// A double-faced card has its images and mana cost on the faces: the front one stands in
export function frontImageUris(card: ScryfallCard): ScryfallImageUris | undefined {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris
}

export function toPrinting(card: ScryfallCard): PricePrinting {
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    finishes: card.finishes ?? [],
    cardmarketPrice: toPrice(card.prices?.eur),
    cardmarketFoilPrice: toPrice(card.prices?.eur_foil),
    cardmarketUrl: card.purchase_uris?.cardmarket ?? null,
    scryfallUrl: card.scryfall_uri,
    thumbnailUrl: frontImageUris(card)?.small ?? null
  }
}

export async function fetchScryfallCard(scryfallId: string): Promise<ScryfallCard | null> {
  return scryfallOrNull(scryfallGet<ScryfallCard>(`/cards/${scryfallId}`))
}
