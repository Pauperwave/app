// test\unit\server\commanders\catalogStore.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backfillReleasedDates,
  fetchCatalogRows,
  insertNewCards
} from '../../../../server/utils/commanders/catalogStore'
import type { CatalogCard } from '../../../../server/utils/commanders/catalogSync'
import { createFakeSupabase, fakeCreateError, opsNamed } from '../fakeSupabase'

beforeEach(() => {
  vi.stubGlobal('createError', fakeCreateError)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const scryfallCard = (id: string, name: string): CatalogCard => ({ id, name, layout: 'normal' })

describe('fetchCatalogRows', () => {
  it('reads one page when the catalog is smaller than a page', async () => {
    const { client, calls } = createFakeSupabase(() => ({
      data: [{ scryfall_id: 'a', card_name: 'A', released_at: null }], error: null
    }))

    const rows = await fetchCatalogRows(client as never)

    expect(rows).toHaveLength(1)
    expect(calls).toHaveLength(1)
    expect(opsNamed(calls[0], 'range')).toEqual([[0, 999]])
  })

  it('goes on page after page while a page comes back full', async () => {
    const page = (size: number) => Array.from({ length: size }, (_, index) => ({
      scryfall_id: `id-${index}`, card_name: `Card ${index}`, released_at: null
    }))
    const { client, calls } = createFakeSupabase((call) => {
      const [from] = opsNamed(call, 'range')[0] as [number, number]
      return { data: from === 0 ? page(1000) : page(250), error: null }
    })

    const rows = await fetchCatalogRows(client as never)

    expect(rows).toHaveLength(1250)
    expect(calls.map(call => opsNamed(call, 'range')[0])).toEqual([[0, 999], [1000, 1999]])
  })

  it('answers 500 with the database error', async () => {
    const { client } = createFakeSupabase(() => ({ error: { message: 'boom' } }))

    await expect(fetchCatalogRows(client as never)).rejects.toMatchObject({
      statusCode: 500, statusMessage: 'boom'
    })
  })
})

describe('backfillReleasedDates', () => {
  it('does nothing when no row misses its date', async () => {
    const { client, calls } = createFakeSupabase()

    expect(await backfillReleasedDates(client as never, [], [])).toBe(0)
    expect(calls).toHaveLength(0)
  })

  it('fills each missing date from the card of the same name', async () => {
    const { client, calls } = createFakeSupabase()
    const fetched = [{ ...scryfallCard('new-id', 'A'), released_at: '2026-01-05' }]

    const filled = await backfillReleasedDates(
      client as never,
      [{ scryfallId: 'old-id', cardName: 'A' }],
      fetched
    )

    expect(filled).toBe(1)
    expect(opsNamed(calls[0], 'upsert')[0]).toEqual([
      [{ scryfall_id: 'old-id', card_name: 'A', released_at: '2026-01-05' }],
      { onConflict: 'scryfall_id' }
    ])
  })

  it('skips a row whose card did not come back, or came back without a date', async () => {
    const { client, calls } = createFakeSupabase()
    const fetched = [scryfallCard('x', 'NoDate')]

    const filled = await backfillReleasedDates(
      client as never,
      [{ scryfallId: 'a', cardName: 'Gone' }, { scryfallId: 'b', cardName: 'NoDate' }],
      fetched
    )

    expect(filled).toBe(0)
    expect(calls).toHaveLength(0)
  })

  it('writes in chunks of 500', async () => {
    const { client, calls } = createFakeSupabase()
    const rows = Array.from({ length: 1100 }, (_, index) => ({
      scryfallId: `id-${index}`, cardName: `Card ${index}`
    }))
    const fetched = rows.map(row => ({
      ...scryfallCard(row.scryfallId, row.cardName), released_at: '2026-01-01'
    }))

    await backfillReleasedDates(client as never, rows, fetched)

    expect(calls.map(call => (opsNamed(call, 'upsert')[0]?.[0] as unknown[]).length))
      .toEqual([500, 500, 100])
  })

  it('answers 500 when a chunk fails', async () => {
    const { client } = createFakeSupabase(() => ({ error: { message: 'nope' } }))

    await expect(backfillReleasedDates(
      client as never,
      [{ scryfallId: 'a', cardName: 'A' }],
      [{ ...scryfallCard('b', 'A'), released_at: '2026-01-01' }]
    )).rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('insertNewCards', () => {
  it('returns no names without touching the database when there is nothing to add', async () => {
    const { client, calls } = createFakeSupabase()

    expect(await insertNewCards(client as never, [])).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('inserts the rows and returns the names the database confirms', async () => {
    const { client, calls } = createFakeSupabase(() => ({
      data: [{ card_name: 'A' }, { card_name: 'B' }], error: null
    }))

    const names = await insertNewCards(
      client as never, [scryfallCard('a', 'A'), scryfallCard('b', 'B')]
    )

    expect(names).toEqual(['A', 'B'])
    expect((opsNamed(calls[0], 'insert')[0]?.[0] as unknown[]).length).toBe(2)
  })

  it('answers 500 with the database error', async () => {
    const { client } = createFakeSupabase(() => ({ error: { message: 'duplicate' } }))

    await expect(insertNewCards(client as never, [scryfallCard('a', 'A')])).rejects.toMatchObject({
      statusCode: 500, statusMessage: 'duplicate'
    })
  })
})
