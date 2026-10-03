// test\unit\shared\wantedCards\decklistLookup.test.ts
import { describe, expect, it } from 'vitest'
import {
  lookupDecklistEntry,
  type ScryfallGetter
} from '../../../../shared/utils/wantedCards/decklistLookup'
import type { ScryfallCard } from '../../../../shared/types/scryfall'

function card(id: string): ScryfallCard {
  return { id, name: 'X', set: 's', set_name: 'S', collector_number: '1', scryfall_uri: 'u' }
}

// Answers by exact request signature; anything else is a 404 (null)
function fakeGetter(answers: Record<string, ScryfallCard>) {
  const calls: string[] = []
  const get = (async (path: string, query?: Record<string, string>) => {
    const key = query ? `${path}?${new URLSearchParams(query).toString()}` : path
    calls.push(key)
    return answers[key] ?? null
  }) as ScryfallGetter
  return { get, calls }
}

describe('lookupDecklistEntry', () => {
  it('uses set and collector number first', async () => {
    const { get, calls } = fakeGetter({ '/cards/sos/15': card('exact') })
    const entry = { name: 'Erode', setCode: 'sos', collectorNumber: '15' }
    expect((await lookupDecklistEntry(entry, get))?.id).toBe('exact')
    expect(calls).toEqual(['/cards/sos/15'])
  })

  it('falls back to the name within the set when the number is unknown', async () => {
    const { get } = fakeGetter({ '/cards/named?fuzzy=Erode&set=sos': card('in-set') })
    const entry = { name: 'Erode', setCode: 'sos', collectorNumber: '999' }
    expect((await lookupDecklistEntry(entry, get))?.id).toBe('in-set')
  })

  it('falls back to the name alone when the set has no such card', async () => {
    const { get } = fakeGetter({ '/cards/named?fuzzy=Erode': card('by-name') })
    const entry = { name: 'Erode', setCode: 'xxx', collectorNumber: '1' }
    expect((await lookupDecklistEntry(entry, get))?.id).toBe('by-name')
  })

  it('goes straight to the name for a set-less entry', async () => {
    const { get, calls } = fakeGetter({ '/cards/named?fuzzy=Erode': card('by-name') })
    await lookupDecklistEntry({ name: 'Erode', setCode: null, collectorNumber: null }, get)
    expect(calls).toEqual(['/cards/named?fuzzy=Erode'])
  })

  it('encodes the collector number in the path', async () => {
    const { get, calls } = fakeGetter({})
    await lookupDecklistEntry({ name: 'X', setCode: 'abc', collectorNumber: '12★' }, get)
    expect(calls[0]).toBe('/cards/abc/12%E2%98%85')
  })

  it('is null when nothing matches', async () => {
    const { get } = fakeGetter({})
    const entry = { name: 'Nope', setCode: null, collectorNumber: null }
    expect(await lookupDecklistEntry(entry, get)).toBeNull()
  })
})
