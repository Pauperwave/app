// test\unit\server\telegram\wantedRow.test.ts
import { describe, expect, it } from 'vitest'
import {
  decodePriceState,
  decodeWantState,
  encodeWantState,
  type PricePrinting
} from '../../../../server/utils/telegram/commands/cards/priceCard'
import {
  buildWantedCardRow,
  isAlreadyWanted,
  wantedLanguageOf,
  wantedTreatmentOf
} from '../../../../server/utils/telegram/commands/cards/wantedRow'
import type { ScryfallCard } from '../../../../server/utils/telegram/commands/cards/scryfall'

const CARD_ID = '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'
const ASSOCIATE = '11111111-2222-3333-4444-555555555555'
const NOW = new Date('2026-10-03T12:00:00.000Z')

function makeCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: CARD_ID,
    name: 'Lightning Bolt',
    set: 'm10',
    set_name: 'Magic 2010',
    collector_number: '146',
    scryfall_uri: 'https://scryfall.com/card/m10/146',
    mana_cost: '{R}',
    color_identity: ['R'],
    type_line: 'Instant',
    cmc: 1,
    image_uris: { normal: 'https://img/normal.jpg', small: 'https://img/small.jpg' },
    ...overrides
  }
}

function makePrinting(overrides: Partial<PricePrinting> = {}): PricePrinting {
  return {
    id: CARD_ID,
    name: 'Lightning Bolt',
    set: 'm10',
    setName: 'Magic 2010',
    collectorNumber: '146',
    finishes: ['nonfoil', 'foil'],
    cardmarketPrice: 0.25,
    cardmarketFoilPrice: 1.5,
    cardmarketUrl: null,
    scryfallUrl: 'https://scryfall.com/card/m10/146',
    thumbnailUrl: null,
    ...overrides
  }
}

describe('want callback state', () => {
  it('round-trips under its own prefix', () => {
    const state = { scryfallId: CARD_ID, language: 'it' as const, foil: true }
    expect(decodeWantState(encodeWantState(state))).toEqual(state)
  })

  it('is not mistaken for a price state, nor the other way around', () => {
    const data = encodeWantState({ scryfallId: CARD_ID, language: 'all', foil: false })
    expect(decodePriceState(data)).toBeNull()
    expect(decodeWantState(`prz:${CARD_ID}:all:0`)).toBeNull()
  })
})

describe('wanted card choices', () => {
  it('stores "Tutte" as no language preference', () => {
    expect(wantedLanguageOf('all')).toBeNull()
    expect(wantedLanguageOf('it')).toBe('it')
    expect(wantedLanguageOf('en')).toBe('en')
  })

  it('stores foil as a treatment', () => {
    expect(wantedTreatmentOf(true)).toEqual(['foil'])
    expect(wantedTreatmentOf(false)).toEqual([])
  })
})

describe('buildWantedCardRow', () => {
  it('maps the printing and the chosen filters onto the table columns', () => {
    const row = buildWantedCardRow(
      makeCard(), makePrinting(), ASSOCIATE, { language: 'it', foil: false }, NOW
    )
    expect(row).toMatchObject({
      player_associate_uuid: ASSOCIATE,
      card_name: 'Lightning Bolt',
      scryfall_id: CARD_ID,
      set_code: 'm10',
      mana_cost: '{R}',
      color_identity: ['R'],
      type_line: 'Instant',
      cmc: 1,
      image_url: 'https://img/normal.jpg',
      copies: 1,
      language: 'it',
      treatment: [],
      notes: null,
      created_by: ASSOCIATE,
      updated_by: ASSOCIATE
    })
  })

  it('records the CardMarket price of the chosen finish with its sync time', () => {
    const normal = buildWantedCardRow(makeCard(), makePrinting(), ASSOCIATE, { language: 'all', foil: false }, NOW)
    const foil = buildWantedCardRow(makeCard(), makePrinting(), ASSOCIATE, { language: 'all', foil: true }, NOW)
    expect(normal.cardmarket_price).toBe(0.25)
    expect(foil.cardmarket_price).toBe(1.5)
    expect(foil.treatment).toEqual(['foil'])
    expect(foil.cardmarket_price_synced_at).toBe(NOW.toISOString())
  })

  it('leaves the price and its sync time empty when CardMarket has none', () => {
    const row = buildWantedCardRow(
      makeCard(), makePrinting({ cardmarketPrice: null }), ASSOCIATE, { language: 'all', foil: false }, NOW
    )
    expect(row.cardmarket_price).toBeNull()
    expect(row.cardmarket_price_synced_at).toBeNull()
  })

  it('reads the image and mana cost from the front face of a double-faced card', () => {
    const card = makeCard({
      name: 'Storm the Vault // Vault of Catlacan',
      mana_cost: undefined,
      image_uris: undefined,
      card_faces: [{ mana_cost: '{2}{R}', image_uris: { normal: 'https://img/front.jpg' } }]
    })
    const row = buildWantedCardRow(card, makePrinting(), ASSOCIATE, { language: 'all', foil: false }, NOW)
    expect(row.mana_cost).toBe('{2}{R}')
    expect(row.image_url).toBe('https://img/front.jpg')
  })
})

describe('isAlreadyWanted', () => {
  const existing = [{ language: 'it', treatment: ['foil'] }]

  it('detects the same language and finish', () => {
    expect(isAlreadyWanted(existing, { language: 'it', foil: true })).toBe(true)
  })

  it('treats another language or finish as a different request', () => {
    expect(isAlreadyWanted(existing, { language: 'en', foil: true })).toBe(false)
    expect(isAlreadyWanted(existing, { language: 'it', foil: false })).toBe(false)
    expect(isAlreadyWanted(existing, { language: 'all', foil: true })).toBe(false)
  })

  it('matches "any language" only against an any-language request', () => {
    expect(isAlreadyWanted([{ language: null, treatment: [] }], { language: 'all', foil: false })).toBe(true)
    expect(isAlreadyWanted([{ language: null, treatment: [] }], { language: 'it', foil: false })).toBe(false)
  })

  it('is false with nothing saved yet', () => {
    expect(isAlreadyWanted([], { language: 'all', foil: false })).toBe(false)
  })
})
