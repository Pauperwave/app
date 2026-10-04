// test\unit\utils\wantedCards\actionTargets.test.ts
import { describe, expect, it } from 'vitest'
import { canRefreshPrices, contextMenuTargets } from '~/utils/wantedCards/actionTargets'
import type { WantedCard } from '~/types'

function card(id: number): WantedCard {
  return { id, cardName: `Card ${id}` } as WantedCard
}

describe('contextMenuTargets', () => {
  it('is the whole selection when the right-clicked card is in it', () => {
    const selected = [card(1), card(2), card(3)]
    expect(contextMenuTargets(card(2), selected)).toBe(selected)
  })

  it('is just the right-clicked card when it is not in the selection', () => {
    const targets = contextMenuTargets(card(9), [card(1), card(2)])
    expect(targets.map(item => item.id)).toEqual([9])
  })

  it('is just the right-clicked card when nothing is selected', () => {
    expect(contextMenuTargets(card(5), []).map(item => item.id)).toEqual([5])
  })
})

describe('canRefreshPrices', () => {
  it('needs both the Scryfall id and the set code', () => {
    expect(canRefreshPrices({ scryfallId: 'abc', setCode: 'lea' })).toBe(true)
    expect(canRefreshPrices({ scryfallId: null, setCode: 'lea' })).toBe(false)
    expect(canRefreshPrices({ scryfallId: 'abc', setCode: null })).toBe(false)
    expect(canRefreshPrices({ scryfallId: '', setCode: 'lea' })).toBe(false)
  })
})
