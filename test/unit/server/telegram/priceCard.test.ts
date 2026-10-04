// test\unit\server\telegram\priceCard.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildInlineDescription,
  buildInlineTitle,
  buildPriceKeyboard,
  buildPriceMessage,
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

type Message = ReturnType<typeof buildPriceMessage>
type Block = NonNullable<Message['blocks']>[number]
type ButtonsBlock = Extract<Block, { type: 'buttons' }>
type Button = ButtonsBlock['buttons'][number]

// Flattens a rich text (string, array or styled node) to its plain characters
function plain(text: unknown): string {
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.map(plain).join('')
  if (text && typeof text === 'object' && 'text' in text) return plain(text.text)
  return ''
}

function blocksOf(message: Message): Block[] {
  return message.blocks ?? []
}

function messageText(message: Message): string {
  return blocksOf(message)
    .flatMap(block => (block.type === 'paragraph' ? [plain(block.text)] : []))
    .join('\n')
}

function buttonsOf(message: Message): Button[] {
  return blocksOf(message).flatMap(block => (block.type === 'buttons' ? block.buttons : []))
}

function buttonTexts(message: Message): string[] {
  return buttonsOf(message).map(button => plain(button.text))
}

function callbackOf(button: Button | undefined): string {
  return button && 'callback_data' in button ? button.callback_data : ''
}

// The language and foil buttons are one row of the message
function filterRows(message: Message): ButtonsBlock[] {
  return blocksOf(message).filter((block): block is ButtonsBlock => block.type === 'buttons')
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

describe('buildPriceMessage text', () => {
  it('shows both prices for the default state', () => {
    const message = buildPriceMessage(makePrinting(), baseState, { price: 0.4, url: null })
    const text = messageText(message)
    expect(text).toContain('Lightning Bolt')
    expect(text).toContain('Magic 2010 · M10 #146')
    expect(text).toMatch(/CardMarket: 0,25\s€/)
    expect(text).toMatch(/CardTrader \(NM, tutte le lingue\): 0,40\s€/)
    expect(text).not.toContain('non filtrabile')
  })

  it('uses the foil price when foil is on', () => {
    const text = messageText(buildPriceMessage(makePrinting(), { ...baseState, foil: true }, null))
    expect(text).toMatch(/CardMarket: 1,50\s€/)
  })

  it('says foil on the set line only for a foil-only printing, which has no toggle', () => {
    const foilOnly = makePrinting({ finishes: ['foil'] })
    expect(messageText(buildPriceMessage(foilOnly, baseState, null))).toContain('M10 #146 · foil')
    expect(messageText(buildPriceMessage(makePrinting(), baseState, null))).not.toContain('· foil')
  })

  it('has no Lingua or Variante labels', () => {
    const text = messageText(buildPriceMessage(makePrinting(), baseState, null))
    expect(text).not.toContain('Lingua')
    expect(text).not.toContain('Variante')
  })

  it('carries no photo block, which an inline result rejects when it is a URL', () => {
    const message = buildPriceMessage(makePrinting(), baseState, null)
    expect(blocksOf(message).some(block => block.type === 'photo')).toBe(false)
  })

  it('notes that CardMarket cannot be filtered by language', () => {
    const message = buildPriceMessage(makePrinting(), { ...baseState, language: 'it' }, { price: 0.9, url: null })
    expect(messageText(message)).toContain('(non filtrabile per lingua)')
    expect(messageText(message)).toContain('CardTrader (NM, italiano)')
  })

  it('reports missing prices without a number', () => {
    const printing = makePrinting({ cardmarketPrice: null })
    const text = messageText(buildPriceMessage(printing, baseState, { price: null, url: null }))
    expect(text).toContain('CardMarket: non disponibile')
    expect(text).toContain('nessuna offerta')
  })

  it('says CardTrader is unavailable when it could not be queried', () => {
    const text = messageText(buildPriceMessage(makePrinting(), baseState, null))
    expect(text).toContain('CardTrader (NM, tutte le lingue): non disponibile')
  })

  it('says CardTrader is being checked while it is still pending', () => {
    const text = messageText(buildPriceMessage(makePrinting(), baseState, 'pending'))
    expect(text).toContain('CardTrader (NM, tutte le lingue): controllo in corso')
  })

  it('keeps card and set names as plain text, with no HTML escaping', () => {
    const text = messageText(buildPriceMessage(makePrinting({ name: 'Fire <&> Ice' }), baseState, null))
    expect(text).toContain('Fire <&> Ice')
    expect(escapeHtml('a<b')).toBe('a&lt;b')
  })
})

describe('buildPriceMessage buttons', () => {
  it('puts the languages and the foil toggle in a single row', () => {
    const rows = filterRows(buildPriceMessage(makePrinting(), baseState, null))
    expect(rows).toHaveLength(1)
    const texts = rows[0]?.buttons.map(button => plain(button.text)) ?? []
    expect(texts).toHaveLength(4)
    expect(texts[0]).toContain('Tutte')
    expect(texts[1]).toContain('ITA')
    expect(texts[2]).toContain('ENG')
    expect(texts[3]).toContain('Foil')
  })

  it('keeps the wanted-card action out of the message', () => {
    const message = buildPriceMessage(makePrinting(), baseState, null)
    expect(buttonTexts(message).some(text => text.includes('cercate'))).toBe(false)
  })

  it('marks the active language and keeps the others pressable', () => {
    const message = buildPriceMessage(makePrinting(), { ...baseState, language: 'it' }, null)
    const texts = buttonTexts(message)
    expect(texts.some(text => text.startsWith('✅') && text.includes('ITA'))).toBe(true)
    expect(texts.filter(text => text.startsWith('✅'))).toHaveLength(1)
  })

  it('has "Tutte" active in the default state', () => {
    const active = buttonTexts(buildPriceMessage(makePrinting(), baseState, null))
      .filter(text => text.startsWith('✅'))
    expect(active).toHaveLength(1)
    expect(active[0]).toContain('Tutte')
  })

  it('flips the foil flag when the toggle is pressed and keeps the language', () => {
    const message = buildPriceMessage(makePrinting(), { ...baseState, language: 'en' }, null)
    const toggle = buttonsOf(message).find(button => plain(button.text).includes('Foil'))
    expect(decodePriceState(callbackOf(toggle))).toEqual({ scryfallId: ID, language: 'en', foil: true })
  })

  it('hides the foil toggle when the finish cannot be chosen', () => {
    const message = buildPriceMessage(makePrinting({ finishes: ['nonfoil'] }), baseState, null)
    expect(buttonTexts(message).some(text => text.includes('Foil'))).toBe(false)
  })
})

describe('buildPriceKeyboard', () => {
  function keyboardOf(state: PriceState, cardtraderUrl: string | null) {
    return buildPriceKeyboard(makePrinting(), state, cardtraderUrl)
  }

  function linkTexts(cardtraderUrl: string | null) {
    return keyboardOf(baseState, cardtraderUrl).inline_keyboard.flat()
      .filter(button => 'url' in button)
      .map(button => button.text)
  }

  it('offers to save the printing as a wanted card with the current filters', () => {
    const state: PriceState = { ...baseState, language: 'it', foil: true }
    const add = keyboardOf(state, null).inline_keyboard.flat()
      .find(button => button.text.includes('cercate'))
    const data = add && 'callback_data' in add ? add.callback_data : ''
    expect(decodeWantState(data)).toEqual({ scryfallId: ID, language: 'it', foil: true })
  })

  it('puts the wanted-card action above the links', () => {
    const rows = keyboardOf(baseState, null).inline_keyboard
    expect(rows[0]?.[0]?.text).toContain('cercate')
    expect(rows[1]?.map(button => button.text)).toEqual(['CardMarket', 'Scryfall'])
  })

  it('adds the CardTrader link only when it is known', () => {
    expect(linkTexts(null)).not.toContain('CardTrader')
    expect(linkTexts('https://www.cardtrader.com/en/cards/1')).toContain('CardTrader')
  })

  it('always links CardMarket and Scryfall', () => {
    expect(linkTexts(null)).toEqual(['CardMarket', 'Scryfall'])
  })

  it('skips the CardMarket link when the printing has none', () => {
    const keyboard = buildPriceKeyboard(makePrinting({ cardmarketUrl: null }), baseState, null)
    const links = keyboard.inline_keyboard.flat().filter(button => 'url' in button)
    expect(links.map(button => button.text)).toEqual(['Scryfall'])
  })
})
