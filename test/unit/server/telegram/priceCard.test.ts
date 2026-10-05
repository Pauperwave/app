// test\unit\server\telegram\priceCard.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildInlineDescription,
  buildInlineTitle,
  buildPriceRichMessage,
  buildWantedKeyboard,
  canToggleFoil,
  cardmarketUrlFor,
  decodeFoundState,
  decodePriceState,
  decodeRemoveState,
  decodeWantState,
  effectiveFoil,
  encodePriceState,
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

type RichBlocks = NonNullable<ReturnType<typeof buildPriceRichMessage>['blocks']>
type Cardtrader = Parameters<typeof buildPriceRichMessage>[2]
type Kind = Parameters<typeof buildPriceRichMessage>[3]

function blocksOf(
  printing = makePrinting(),
  state = baseState,
  cardtrader: Cardtrader = null,
  kind: Kind = 'inline'
): RichBlocks {
  return buildPriceRichMessage(printing, state, cardtrader, kind).blocks ?? []
}

// The paragraphs' text with the formatting stripped, one entry per paragraph
function linesOf(blocks: RichBlocks): string[] {
  const flatten = (text: unknown): string => {
    if (typeof text === 'string') return text
    if (Array.isArray(text)) return text.map(flatten).join('')
    if (text && typeof text === 'object' && 'text' in text) return flatten(text.text)
    return ''
  }
  return blocks.flatMap(block => block.type === 'paragraph' ? [flatten(block.text)] : [])
}

function buttonRows(blocks: RichBlocks) {
  return blocks.flatMap(block => block.type === 'buttons' ? [block.buttons] : [])
}

function callbackOf(button: object | undefined) {
  return button && 'callback_data' in button ? String(button.callback_data) : ''
}

describe('buildPriceRichMessage text', () => {
  it('shows both prices for the default state', () => {
    const lines = linesOf(blocksOf(makePrinting(), baseState, { price: 0.4, url: null }))
    expect(lines[0]).toContain('Lightning Bolt')
    expect(lines[1]).toBe('Magic 2010 · M10 #146 · normale')
    expect(lines[2]).toMatch(/^CardMarket: 0,25\s€$/)
    expect(lines[3]).toMatch(/^CardTrader \(NM, tutte le lingue\): 0,40\s€$/)
  })

  it('uses the foil price and says the finish', () => {
    const lines = linesOf(blocksOf(makePrinting(), { ...baseState, foil: true }))
    expect(lines[1]).toContain('M10 #146 · foil')
    expect(lines[2]).toMatch(/^CardMarket: 1,50\s€$/)
  })

  it('notes that CardMarket cannot be filtered by language', () => {
    const lines = linesOf(blocksOf(makePrinting(), { ...baseState, language: 'it' }, { price: 0.9, url: null }))
    expect(lines[2]).toContain('(non filtrabile per lingua)')
    expect(lines[3]).toContain('CardTrader (NM, italiano)')
  })

  it('reports missing prices without a number', () => {
    const printing = makePrinting({ cardmarketPrice: null })
    const lines = linesOf(blocksOf(printing, baseState, { price: null, url: null }))
    expect(lines[2]).toBe('CardMarket: non disponibile')
    expect(lines[3]).toContain('nessuna offerta')
  })

  it('says CardTrader is unavailable when it could not be queried', () => {
    expect(linesOf(blocksOf())[3]).toBe('CardTrader (NM, tutte le lingue): non disponibile')
  })

  it('says CardTrader is being checked while it is still pending', () => {
    expect(linesOf(blocksOf(makePrinting(), baseState, 'pending'))[3]).toContain('controllo in corso')
  })
})

describe('buildPriceRichMessage filters', () => {
  function filterTexts(printing = makePrinting(), state = baseState) {
    return (buttonRows(blocksOf(printing, state))[0] ?? []).map(button => String(button.text))
  }

  it('puts the languages and the foil toggle in the first buttons block', () => {
    const texts = filterTexts()
    expect(texts).toHaveLength(4)
    expect(texts[3]).toContain('Foil')
  })

  it('marks the active language and keeps the others pressable', () => {
    const texts = filterTexts(makePrinting(), { ...baseState, language: 'it' })
    expect(texts.filter(text => text.startsWith('✅'))).toHaveLength(1)
    expect(texts.some(text => text.startsWith('✅') && text.includes('ITA'))).toBe(true)
  })

  it('has "Tutte" active in the default state', () => {
    const active = filterTexts().filter(text => text.startsWith('✅'))
    expect(active).toHaveLength(1)
    expect(active[0]).toContain('Tutte')
  })

  it('flips the foil flag when the toggle is pressed and keeps the language', () => {
    const row = buttonRows(blocksOf(makePrinting(), { ...baseState, language: 'en' }))[0] ?? []
    const toggle = row.find(button => String(button.text).includes('Foil'))
    expect(decodePriceState(callbackOf(toggle))).toEqual({ scryfallId: ID, language: 'en', foil: true })
  })

  it('hides the foil toggle when the finish cannot be chosen', () => {
    const texts = filterTexts(makePrinting({ finishes: ['nonfoil'] }))
    expect(texts.some(text => text.includes('Foil'))).toBe(false)
  })

  it('has no filters in the detail kind', () => {
    const rows = buttonRows(blocksOf(makePrinting(), baseState, null, 'detail'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.map(button => button.text)).toEqual(['CardMarket', 'Scryfall'])
  })
})

describe('buildPriceRichMessage store links', () => {
  it('adds the CardTrader link only when it is known', () => {
    const links = (cardtrader: Cardtrader) =>
      buttonRows(blocksOf(makePrinting(), baseState, cardtrader)).at(-1)?.map(button => button.text)
    expect(links(null)).toEqual(['CardMarket', 'Scryfall'])
    expect(links('pending')).toEqual(['CardMarket', 'Scryfall'])
    expect(links({ price: 1, url: 'https://www.cardtrader.com/en/cards/1' }))
      .toEqual(['CardMarket', 'CardTrader', 'Scryfall'])
  })
})

describe('buildWantedKeyboard', () => {
  it('offers to save the printing as a wanted card with the current filters', () => {
    const keyboard = buildWantedKeyboard(makePrinting(), { ...baseState, language: 'it', foil: true })
    expect(keyboard.inline_keyboard).toHaveLength(1)
    const add = keyboard.inline_keyboard.flat().find(button => button.text.includes('cercate'))
    expect(decodeWantState(callbackOf(add))).toEqual({ scryfallId: ID, language: 'it', foil: true })
  })
})

describe('buildWantedKeyboard for a card already among the wanted ones', () => {
  function rowsOf(printing = makePrinting(), state = baseState) {
    return buildWantedKeyboard(printing, state, true).inline_keyboard
  }

  it('says the card is already there instead of offering to add it', () => {
    const texts = rowsOf().flat().map(button => button.text)
    expect(texts.some(text => text.includes('già presente nelle tue carte cercate'))).toBe(true)
    expect(texts.some(text => text.includes('Aggiungi'))).toBe(false)
  })

  it('puts found and remove side by side under the label', () => {
    const rows = rowsOf()
    expect(rows[0]?.[0]?.text).toContain('già presente')
    expect(rows[1]?.map(button => button.text.replace(/^\S+\s/, ''))).toEqual(['Segna come trovata', 'Rimuovi'])
  })

  it('acts on the finish actually priced, also for a foil-only printing', () => {
    const foilOnly = makePrinting({ finishes: ['foil'] })
    const actionRow = rowsOf(foilOnly, { ...baseState, language: 'it' })[1]
    expect(decodeFoundState(callbackOf(actionRow?.[0]))).toEqual({ scryfallId: ID, language: 'it', foil: true })
    expect(decodeRemoveState(callbackOf(actionRow?.[1]))).toEqual({ scryfallId: ID, language: 'it', foil: true })
  })

  it('keeps the add button when the card is not wanted yet', () => {
    const texts = buildWantedKeyboard(makePrinting(), baseState).inline_keyboard.flat()
      .map(button => button.text)
    expect(texts.some(text => text.includes('Aggiungi alle mie carte cercate'))).toBe(true)
    expect(texts.some(text => text.includes('Rimuovi'))).toBe(false)
  })

  it('keeps found and remove under their own callback prefixes', () => {
    const data = encodePriceState(baseState)
    expect(decodeFoundState(data)).toBeNull()
    expect(decodeRemoveState(data)).toBeNull()
  })
})

describe('cardmarketUrlFor', () => {
  const url = 'https://www.cardmarket.com/en/Magic/Products/Singles/Set/Card?referrer=scryfall'

  it('keeps the link as is for any language', () => {
    expect(cardmarketUrlFor(makePrinting({ cardmarketUrl: url }), 'all')).toBe(url)
  })

  it('adds the CardMarket language id to the query', () => {
    const printing = makePrinting({ cardmarketUrl: url })
    expect(cardmarketUrlFor(printing, 'en')).toBe(`${url}&language=1`)
    expect(cardmarketUrlFor(printing, 'it')).toBe(`${url}&language=5`)
  })

  it('has no link when the printing has none', () => {
    expect(cardmarketUrlFor(makePrinting({ cardmarketUrl: null }), 'it')).toBeNull()
  })
})

describe('buildPriceRichMessage art', () => {
  it('puts the card art first in the detail kind only', () => {
    const printing = makePrinting({ imageUrl: 'https://img.test/a.jpg' })
    expect(blocksOf(printing, baseState, null, 'detail')[0]).toMatchObject({ type: 'photo' })
    expect(blocksOf(printing, baseState, null, 'inline').some(block => block.type === 'photo')).toBe(false)
  })

  it('has no photo block without art', () => {
    const blocks = blocksOf(makePrinting({ imageUrl: null }), baseState, null, 'detail')
    expect(blocks.some(block => block.type === 'photo')).toBe(false)
  })
})
