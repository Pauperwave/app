// test\unit\shared\wantedCards\wantedCardRow.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildWantedCardRow,
  isAlreadyWanted,
  isFoilOnlyPrinting,
  wantedChoiceFor,
  wantedTreatmentOf
} from '../../../../shared/utils/wantedCards/wantedCardRow'
import type { ScryfallCard } from '../../../../shared/types/scryfall'

const ASSOCIATE = '11111111-2222-3333-4444-555555555555'
const NOW = new Date('2026-10-03T12:00:00.000Z')
const ANY = { language: null, foil: false, copies: 1 }

function makeCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90',
    name: 'Lightning Bolt',
    set: 'm10',
    set_name: 'Magic 2010',
    collector_number: '146',
    finishes: ['nonfoil', 'foil'],
    prices: { eur: '0.25', eur_foil: '1.50' },
    scryfall_uri: 'https://scryfall.com/card/m10/146',
    mana_cost: '{R}',
    color_identity: ['R'],
    type_line: 'Instant',
    cmc: 1,
    image_uris: { normal: 'https://img/normal.jpg', small: 'https://img/small.jpg' },
    ...overrides
  }
}

describe('foil rules', () => {
  it('treats a printing without a nonfoil finish as foil-only', () => {
    expect(isFoilOnlyPrinting(['foil'])).toBe(true)
    expect(isFoilOnlyPrinting(['nonfoil', 'foil'])).toBe(false)
  })

  it('forces foil on a foil-only printing whatever was asked', () => {
    expect(wantedChoiceFor({ finishes: ['foil'] }, ANY).foil).toBe(true)
    expect(wantedChoiceFor({ finishes: ['nonfoil'] }, ANY).foil).toBe(false)
  })

  it('stores foil as a treatment', () => {
    expect(wantedTreatmentOf(true)).toEqual(['foil'])
    expect(wantedTreatmentOf(false)).toEqual([])
  })
})

describe('buildWantedCardRow', () => {
  it('maps the card and the choice onto the table columns', () => {
    const choice = { language: 'it', foil: false, copies: 3 }
    expect(buildWantedCardRow(makeCard(), ASSOCIATE, choice, NOW)).toMatchObject({
      player_associate_uuid: ASSOCIATE,
      card_name: 'Lightning Bolt',
      set_code: 'm10',
      mana_cost: '{R}',
      color_identity: ['R'],
      type_line: 'Instant',
      cmc: 1,
      image_url: 'https://img/normal.jpg',
      copies: 3,
      language: 'it',
      treatment: [],
      notes: null,
      created_by: ASSOCIATE,
      updated_by: ASSOCIATE
    })
  })

  it('records the price of the chosen finish with its sync time', () => {
    const normal = buildWantedCardRow(makeCard(), ASSOCIATE, ANY, NOW)
    const foil = buildWantedCardRow(makeCard(), ASSOCIATE, { ...ANY, foil: true }, NOW)
    expect(normal.cardmarket_price).toBe(0.25)
    expect(foil.cardmarket_price).toBe(1.5)
    expect(foil.cardmarket_price_synced_at).toBe(NOW.toISOString())
  })

  it('leaves price and sync time empty without a CardMarket price', () => {
    const row = buildWantedCardRow(makeCard({ prices: { eur: null } }), ASSOCIATE, ANY, NOW)
    expect(row.cardmarket_price).toBeNull()
    expect(row.cardmarket_price_synced_at).toBeNull()
  })

  it('reads image and mana cost from the front face of a double-faced card', () => {
    const card = makeCard({
      mana_cost: undefined,
      image_uris: undefined,
      card_faces: [{ mana_cost: '{2}{R}', image_uris: { normal: 'https://img/front.jpg' } }]
    })
    const row = buildWantedCardRow(card, ASSOCIATE, ANY, NOW)
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
    expect(isAlreadyWanted(existing, { language: null, foil: true })).toBe(false)
  })

  it('matches "any language" only against an any-language request', () => {
    const anyLanguage = [{ language: null, treatment: [] }]
    expect(isAlreadyWanted(anyLanguage, { language: null, foil: false })).toBe(true)
    expect(isAlreadyWanted(anyLanguage, { language: 'it', foil: false })).toBe(false)
  })

  it('is false with nothing saved yet', () => {
    expect(isAlreadyWanted([], { language: null, foil: false })).toBe(false)
  })
})
