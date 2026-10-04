// shared\utils\wantedCards\wantedCardRow.ts
import type { Database } from '#shared/utils/types/database'
import type { ScryfallCard, ScryfallImageUris } from '#shared/types/scryfall'

// The row a wanted card is saved as when created from a Scryfall card (the Telegram bot's add button
// and import), mirroring what the site's form derives from the picked printing
// (wantedCardEditsFromPrinting.ts)

export type WantedCardInsert = Database['public']['Tables']['pauperwave_wanted_cards']['Insert']

export interface WantedCardChoice {
  // 'it', 'en', ... or null for "any language"
  language: string | null
  foil: boolean
  copies: number
}

// A printing with no nonfoil finish can only be had as foil
export function isFoilOnlyPrinting(finishes: string[] | undefined): boolean {
  return !(finishes ?? []).includes('nonfoil')
}

export function wantedTreatmentOf(foil: boolean): string[] {
  return foil ? ['foil'] : []
}

// The finish actually wanted: a foil-only printing is foil whatever was asked
export function wantedChoiceFor(
  card: Pick<ScryfallCard, 'finishes'>,
  requested: WantedCardChoice
): WantedCardChoice {
  return { ...requested, foil: requested.foil || isFoilOnlyPrinting(card.finishes) }
}

// A double-faced card has its images on the faces: the front one stands in
export function frontImageUris(card: ScryfallCard): ScryfallImageUris | undefined {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris
}

export function parseScryfallPrice(raw: string | null | undefined): number | null {
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function cardmarketPriceOfCard(card: ScryfallCard, foil: boolean): number | null {
  return parseScryfallPrice(foil ? card.prices?.eur_foil : card.prices?.eur)
}

export function buildWantedCardRow(
  card: ScryfallCard,
  associateUuid: string,
  choice: WantedCardChoice,
  now: Date
): WantedCardInsert {
  const price = cardmarketPriceOfCard(card, choice.foil)
  const imageUris = frontImageUris(card)

  return {
    player_associate_uuid: associateUuid,
    card_name: card.name,
    scryfall_url: card.scryfall_uri,
    scryfall_id: card.id,
    set_code: card.set,
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || null,
    color_identity: card.color_identity ?? [],
    type_line: card.type_line || null,
    cmc: card.cmc ?? 0,
    image_url: imageUris?.normal ?? imageUris?.large ?? null,
    cardmarket_price: price,
    cardmarket_price_synced_at: price !== null ? now.toISOString() : null,
    copies: choice.copies,
    language: choice.language,
    treatment: wantedTreatmentOf(choice.foil),
    notes: null,
    created_by: associateUuid,
    updated_by: associateUuid
  }
}

interface ExistingWantedCard {
  language: string | null
  treatment: string[]
}

// The row for the same printing, language and finish already searched for by this associate: a
// second row would only duplicate it (copies aren't compared, a repeat doesn't add up)
export function findWantedMatch<T extends ExistingWantedCard>(
  existing: T[],
  choice: Pick<WantedCardChoice, 'language' | 'foil'>
): T | undefined {
  const treatment = wantedTreatmentOf(choice.foil)

  return existing.find(row => row.language === choice.language
    && row.treatment.length === treatment.length
    && row.treatment.every(value => treatment.includes(value)))
}

export function isAlreadyWanted(
  existing: ExistingWantedCard[],
  choice: Pick<WantedCardChoice, 'language' | 'foil'>
): boolean {
  return findWantedMatch(existing, choice) !== undefined
}
