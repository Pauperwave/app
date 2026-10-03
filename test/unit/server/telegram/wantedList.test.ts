// test\unit\server\telegram\wantedList.test.ts
import { describe, expect, it } from 'vitest'
import {
  WANTED_LIST_PAGE_SIZE,
  buildRemoveConfirmKeyboard,
  buildWantedListKeyboard,
  buildWantedListText,
  decodeWantedListCallback,
  encodeWantedListCallback,
  pageCount,
  type WantedListRow
} from '../../../../server/utils/telegram/commands/cards/wantedList'

function row(id: number, overrides: Partial<WantedListRow> = {}): WantedListRow {
  return {
    id,
    card_name: `Card ${id}`,
    set_code: 'm10',
    language: null,
    treatment: [],
    copies: 1,
    cardmarket_price: null,
    image_url: null,
    ...overrides
  }
}

function buttons(keyboard: ReturnType<typeof buildWantedListKeyboard>) {
  return keyboard.inline_keyboard.flat().map(button => ({
    text: button.text,
    data: 'callback_data' in button ? button.callback_data : ''
  }))
}

describe('wanted list callbacks', () => {
  it('round-trips every action', () => {
    for (const callback of [
      { action: 'list' as const, id: null, page: 2 },
      { action: 'ask' as const, id: 41, page: 0 },
      { action: 'remove' as const, id: 41, page: 3 }
    ]) {
      expect(decodeWantedListCallback(encodeWantedListCallback(callback))).toEqual(callback)
    }
  })

  it('rejects malformed or foreign data', () => {
    const malformed = ['', 'prz:1', 'cer:', 'cer:l', 'cer:l:x', 'cer:r:1', 'cer:q:1:2', 'cer:l:1:2']
    for (const data of [...malformed, 'cer:x:1:-1']) {
      expect(decodeWantedListCallback(data)).toBeNull()
    }
  })
})

describe('buildWantedListText', () => {
  it('numbers the rows across pages and shows the details', () => {
    const detailed = row(1, { language: 'it', treatment: ['foil'], copies: 2, cardmarket_price: 1.5 })
    const text = buildWantedListText([detailed], 1, WANTED_LIST_PAGE_SIZE + 1)
    expect(text).toContain(`${WANTED_LIST_PAGE_SIZE + 1}. <b>Card 1</b> (M10) · ×2 · IT · foil · CM`)
    expect(text).toContain('Pagina 2 di 2')
  })

  it('escapes HTML in a card name', () => {
    const text = buildWantedListText([row(1, { card_name: 'A <b> & C' })], 0, 1)
    expect(text).toContain('A &lt;b&gt; &amp; C')
  })

  it('points to the ways of adding a card when the list is empty', () => {
    expect(buildWantedListText([], 0, 0)).toContain('/importa')
  })
})

describe('buildWantedListKeyboard', () => {
  it('has one remove button per row, numbered like the list', () => {
    expect(buttons(buildWantedListKeyboard([row(10), row(11)], 0, 2))).toEqual([
      { text: '🗑 1', data: 'cer:r:10:0' },
      { text: '🗑 2', data: 'cer:r:11:0' }
    ])
  })

  it('only offers the pages that exist', () => {
    const rows = [row(1)]
    const total = WANTED_LIST_PAGE_SIZE * 2 + 1
    const labels = (page: number) => buttons(buildWantedListKeyboard(rows, page, total))
      .map(button => button.text)
    expect(labels(0)).toEqual(['🗑 1', '▶'])
    expect(labels(1)).toEqual(['🗑 9', '◀', '▶'])
    expect(labels(2)).toEqual(['🗑 17', '◀'])
  })
})

describe('remove confirmation', () => {
  it('confirms with the row id and cancels back to the same page', () => {
    const data = buttons(buildRemoveConfirmKeyboard(row(7), 2)).map(button => button.data)
    expect(data).toEqual(['cer:x:7:2', 'cer:l:2'])
  })
})

describe('pageCount', () => {
  it('is at least one page', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(WANTED_LIST_PAGE_SIZE)).toBe(1)
    expect(pageCount(WANTED_LIST_PAGE_SIZE + 1)).toBe(2)
  })
})
