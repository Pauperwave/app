// server\utils\telegram\commands\cards\wantedRow.ts
import type { Database } from '#shared/utils/types/database'
import { cardmarketPriceOf, type PriceLanguage, type PricePrinting } from './priceCard'
import { frontImageUris, type ScryfallCard } from './scryfall'

// The row a wanted card is saved as when added from the bot, mirroring what the website's form
// derives from the picked printing (wantedCardEditsFromPrinting.ts)

export type WantedCardInsert = Database['public']['Tables']['pauperwave_wanted_cards']['Insert']

export interface WantedCardChoice {
  language: PriceLanguage
  foil: boolean
}

// "Tutte" means no preference, which the table stores as null
export function wantedLanguageOf(language: PriceLanguage): string | null {
  return language === 'all' ? null : language
}

export function wantedTreatmentOf(foil: boolean): string[] {
  return foil ? ['foil'] : []
}

export function buildWantedCardRow(
  card: ScryfallCard,
  printing: PricePrinting,
  associateUuid: string,
  choice: WantedCardChoice,
  now: Date
): WantedCardInsert {
  const price = cardmarketPriceOf(printing, choice.foil)
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
    copies: 1,
    language: wantedLanguageOf(choice.language),
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

// The same printing, language and finish already searched for by this associate: a second row
// would only duplicate it
export function isAlreadyWanted(
  existing: ExistingWantedCard[],
  choice: WantedCardChoice
): boolean {
  const language = wantedLanguageOf(choice.language)
  const treatment = wantedTreatmentOf(choice.foil)

  return existing.some(row => row.language === language
    && row.treatment.length === treatment.length
    && row.treatment.every(value => treatment.includes(value)))
}
