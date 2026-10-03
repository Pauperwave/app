// test\unit\server\telegram\priceCard.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildPriceKeyboard,
  buildPriceText,
  canToggleFoil,
  decodePriceState,
  effectiveFoil,
  encodePriceState,
  type PricePrinting,
  type PriceState
} from '../../../../server/utils/telegram/commands/cards/priceCard'

const ID = '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'

function makePrinting(overrides: Partial<PricePrinting> = {}): PricePrinting {
  return {
    id: ID,
    name: 'Lightning Bolt',
    set: 'm10',
    collectorNumber: '146',
    finishes: ['nonfoil', 'foil'],
    cardmarketPrice: 0.25,
    cardmarketFoilPrice: 1.5,
    cardmarketUrl: 'https://www.cardmarket.com/en/Magic/Products/Singles/M10/Lightning-Bolt',
    scryfallUrl: 'https://scryfall.com/card/m10/146',
    ...overrides
  }
}

const baseState: PriceState = { scryfallId: ID, language: 'all', foil: false }

function buttonTexts(keyboard: ReturnType<typeof buildPriceKeyboard>) {
  return keyboard.inline_keyboard.flat().map(button => button.text)
}

describe('price callback state', () => {
  it('round-trips through callback_data', () => {
    const state: PriceState = { scryfallId: ID, language: 'it', foil: true }
    expect(decodePriceState(encodePriceState(state))).toEqual(state)
  })

  it('stays under Telegram\'s 64 byte callback_data limit', () => {
    const data = encodePriceState({ scryfallId: ID, language: 'all', foil: true })
    expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64)
  })

  it.each([
    ['another prefix', `xyz:${ID}:it:0`],
    ['a malformed uuid', 'prz:not-a-uuid:it:0'],
    ['an unknown language', `prz:${ID}:fr:0`],
    ['a bad foil flag', `prz:${ID}:it:2`],
    ['a missing part', `prz:${ID}:it`],
    ['an extra part', `prz:${ID}:it:0:x`]
  ])('rejects %s', (_label, data) => {
    expect(decodePriceState(data)).toBeNull()
  })
})

describe('foil handling', () => {
  it('prices a printing without a nonfoil finish as foil, whatever the state', () => {
    const printing = makePrinting({ finishes: ['foil'] })
    expect(effectiveFoil(printing, baseState)).toBe(true)
    expect(canToggleFoil(printing)).toBe(false)
  })

  it('follows the toggle when both finishes exist', () => {
    const printing = makePrinting()
    expect(effectiveFoil(printing, baseState)).toBe(false)
    expect(effectiveFoil(printing, { ...baseState, foil: true })).toBe(true)
  })

  it('ignores a foil request for a nonfoil-only printing', () => {
    const printing = makePrinting({ finishes: ['nonfoil'] })
    expect(effectiveFoil(printing, { ...baseState, foil: true })).toBe(false)
  })
})

describe('buildPriceText', () => {
  it('shows both prices for the default state', () => {
    const text = buildPriceText(makePrinting(), baseState, { price: 0.4, url: null })
    expect(text).toContain('Lightning Bolt')
    expect(text).toContain('M10 #146 · normale')
    expect(text).toMatch(/CardMarket: \*\*0,25\s€\*\*$/m)
    expect(text).toMatch(/CardTrader \(NM, tutte le lingue\): \*\*0,40\s€\*\*$/m)
    expect(text).not.toContain('non filtrabile')
  })

  it('uses the foil price and says the finish', () => {
    const text = buildPriceText(makePrinting(), { ...baseState, foil: true }, null)
    expect(text).toContain('M10 #146 · foil')
    expect(text).toMatch(/CardMarket: \*\*1,50\s€\*\*/)
  })

  it('notes that CardMarket cannot be filtered by language', () => {
    const text = buildPriceText(makePrinting(), { ...baseState, language: 'it' }, { price: 0.9, url: null })
    expect(text).toContain('CardMarket:')
    expect(text).toContain('(non filtrabile per lingua)')
    expect(text).toContain('CardTrader (NM, italiano)')
  })

  it('reports missing prices without a number', () => {
    const printing = makePrinting({ cardmarketPrice: null })
    const text = buildPriceText(printing, baseState, { price: null, url: null })
    expect(text).toContain('CardMarket: non disponibile')
    expect(text).toContain('nessuna offerta')
  })

  it('says CardTrader is unavailable when it could not be queried', () => {
    const text = buildPriceText(makePrinting(), baseState, null)
    expect(text).toContain('CardTrader (NM, tutte le lingue): non disponibile')
  })
})

describe('buildPriceKeyboard', () => {
  it('marks the active language and keeps the others pressable', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), { ...baseState, language: 'it' }, null)
    const texts = buttonTexts(keyboard)
    expect(texts.some(text => text.startsWith('✅') && text.includes('ITA'))).toBe(true)
    expect(texts.filter(text => text.startsWith('✅'))).toHaveLength(1)
  })

  it('flips the foil flag when the toggle is pressed and keeps the language', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), { ...baseState, language: 'en' }, null)
    const toggle = keyboard.inline_keyboard.flat().find(button => button.text.includes('Foil'))
    const data = 'callback_data' in (toggle ?? {}) ? (toggle as { callback_data: string }).callback_data : ''
    expect(decodePriceState(data)).toEqual({ scryfallId: ID, language: 'en', foil: true })
  })

  it('hides the foil toggle when the finish cannot be chosen', () => {
    const keyboard = buildPriceKeyboard(makePrinting({ finishes: ['nonfoil'] }), baseState, null)
    expect(buttonTexts(keyboard).some(text => text.includes('Foil'))).toBe(false)
  })

  it('adds the CardTrader link only when it is known', () => {
    const without = buttonTexts(buildPriceKeyboard(makePrinting(), baseState, null))
    const withLink = buttonTexts(buildPriceKeyboard(makePrinting(), baseState, 'https://www.cardtrader.com/en/cards/1'))
    expect(without).not.toContain('CardTrader')
    expect(withLink).toContain('CardTrader')
    expect(withLink).toContain('Scryfall')
  })
})
