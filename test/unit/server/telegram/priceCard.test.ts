// test\unit\server\telegram\priceCard.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildInlineDescription,
  buildInlineTitle,
  buildPriceKeyboard,
  buildPriceText,
  canToggleFoil,
  decodePriceState,
  decodeWantState,
  effectiveFoil,
  encodePriceState,
  escapeHtml,
  sortByCardmarketPrice,
  type PricePrinting,
  type PriceState
} from '../../../../server/utils/telegram/commands/cards/priceCard'

const ID = '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'

function makePrinting(overrides: Partial<PricePrinting> = {}): PricePrinting {
  return {
    id: ID,
    name: 'Lightning Bolt',
    set: 'm10',
    setName: 'Magic 2010',
    collectorNumber: '146',
    finishes: ['nonfoil', 'foil'],
    cardmarketPrice: 0.25,
    cardmarketFoilPrice: 1.5,
    cardmarketUrl: 'https://www.cardmarket.com/en/Magic/Products/Singles/M10/Lightning-Bolt',
    scryfallUrl: 'https://scryfall.com/card/m10/146',
    thumbnailUrl: 'https://cards.scryfall.io/small/front/0/b/0b6b.jpg',
    imageUrl: 'https://cards.scryfall.io/normal/front/0/b/0b6b.jpg',
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

describe('inline printing list', () => {
  it('sorts by CardMarket price with unpriced printings last', () => {
    const cheap = makePrinting({ id: 'a', cardmarketPrice: 0.1 })
    const dear = makePrinting({ id: 'b', cardmarketPrice: 5 })
    const unpriced = makePrinting({ id: 'c', cardmarketPrice: null })
    expect(sortByCardmarketPrice([unpriced, dear, cheap]).map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('titles a row with the set and collector number', () => {
    expect(buildInlineTitle(makePrinting())).toBe('Lightning Bolt — M10 #146')
  })

  it('describes a row with the set name and both CardMarket prices', () => {
    const description = buildInlineDescription(makePrinting())
    expect(description).toContain('Magic 2010')
    expect(description).toMatch(/CM 0,25\s€/)
    expect(description).toMatch(/foil 1,50\s€/)
  })

  it('says when a printing has no CardMarket price', () => {
    const description = buildInlineDescription(
      makePrinting({ cardmarketPrice: null, cardmarketFoilPrice: null })
    )
    expect(description).toContain('nessun prezzo CardMarket')
  })
})

describe('buildPriceText', () => {
  it('shows both prices for the default state', () => {
    const text = buildPriceText(makePrinting(), baseState, { price: 0.4, url: null })
    expect(text).toContain('<b>Lightning Bolt</b>')
    expect(text).toContain('Magic 2010 · M10 #146 · normale')
    expect(text).toMatch(/<b><u>CardMarket<\/u><\/b>: <b>0,25\s€<\/b>/)
    expect(text).toMatch(/<b><u>CardTrader<\/u><\/b> \(NM, tutte le lingue\): <b>0,40\s€<\/b>/)
    expect(text).not.toContain('non filtrabile')
  })

  it('uses the foil price and says the finish', () => {
    const text = buildPriceText(makePrinting(), { ...baseState, foil: true }, null)
    expect(text).toContain('M10 #146 · foil')
    expect(text).toMatch(/<b><u>CardMarket<\/u><\/b>: <b>1,50\s€<\/b>/)
  })

  it('notes that CardMarket cannot be filtered by language', () => {
    const text = buildPriceText(makePrinting(), { ...baseState, language: 'it' }, { price: 0.9, url: null })
    expect(text).toContain('(non filtrabile per lingua)')
    expect(text).toContain('<b><u>CardTrader</u></b> (NM, italiano)')
  })

  it('reports missing prices without a number', () => {
    const printing = makePrinting({ cardmarketPrice: null })
    const text = buildPriceText(printing, baseState, { price: null, url: null })
    expect(text).toContain('<b><u>CardMarket</u></b>: non disponibile')
    expect(text).toContain('nessuna offerta')
  })

  it('says CardTrader is unavailable when it could not be queried', () => {
    const text = buildPriceText(makePrinting(), baseState, null)
    expect(text).toContain('<b><u>CardTrader</u></b> (NM, tutte le lingue): non disponibile')
  })

  it('says CardTrader is being checked while it is still pending', () => {
    const text = buildPriceText(makePrinting(), baseState, 'pending')
    expect(text).toContain('<b><u>CardTrader</u></b> (NM, tutte le lingue): controllo in corso')
  })

  it('escapes HTML in card and set names', () => {
    const text = buildPriceText(makePrinting({ name: 'Fire <&> Ice' }), baseState, null)
    expect(text).toContain('Fire &lt;&amp;&gt; Ice')
    expect(escapeHtml('a<b')).toBe('a&lt;b')
  })
})

describe('buildPriceKeyboard', () => {
  it('marks the active language and keeps the others pressable', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), { ...baseState, language: 'it' }, null)
    const texts = buttonTexts(keyboard)
    expect(texts.some(text => text.startsWith('✅') && text.includes('ITA'))).toBe(true)
    expect(texts.filter(text => text.startsWith('✅'))).toHaveLength(1)
  })

  it('puts the languages and the foil toggle in the first row', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), baseState, null)
    const firstRow = keyboard.inline_keyboard[0]?.map(button => button.text) ?? []
    expect(firstRow).toHaveLength(4)
    expect(firstRow[3]).toContain('Foil')
  })

  it('puts the wanted-card action below the filters and above the links', () => {
    const rows = buildPriceKeyboard(makePrinting(), baseState, null).inline_keyboard
    expect(rows[1]?.[0]?.text).toContain('cercate')
    expect(rows[2]?.map(button => button.text)).toEqual(['CardMarket', 'Scryfall'])
  })

  it('has "Tutte" active in the default state', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), baseState, null)
    const active = buttonTexts(keyboard).filter(text => text.startsWith('✅'))
    expect(active).toHaveLength(1)
    expect(active[0]).toContain('Tutte')
  })

  it('flips the foil flag when the toggle is pressed and keeps the language', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), { ...baseState, language: 'en' }, null)
    const toggle = keyboard.inline_keyboard.flat().find(button => button.text.includes('Foil'))
    const data = toggle && 'callback_data' in toggle ? toggle.callback_data : ''
    expect(decodePriceState(data)).toEqual({ scryfallId: ID, language: 'en', foil: true })
  })

  it('offers to save the printing as a wanted card with the current filters', () => {
    const keyboard = buildPriceKeyboard(makePrinting(), { ...baseState, language: 'it', foil: true }, null)
    const add = keyboard.inline_keyboard.flat().find(button => button.text.includes('cercate'))
    const data = add && 'callback_data' in add ? add.callback_data : ''
    expect(decodeWantState(data)).toEqual({ scryfallId: ID, language: 'it', foil: true })
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
