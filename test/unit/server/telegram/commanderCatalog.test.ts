// test\unit\server\telegram\commanderCatalog.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CATALOG_ROWS = [
  {
    card_name: 'Cazur',
    scryfall_id: 'id-cazur',
    partner_type: 'partner_with',
    keywords: null,
    partner_with_scryfall_id: 'id-ukkima',
    art_crop_url: 'https://img/cazur.jpg'
  },
  {
    card_name: 'Ukkima',
    scryfall_id: 'id-ukkima',
    partner_type: 'partner_with',
    keywords: ['Flying'],
    partner_with_scryfall_id: 'id-cazur',
    art_crop_url: null
  }
]

const rpc = vi.fn()

// The module keeps its catalog in a module-level cache, so every test gets a fresh copy of it.
async function loadCatalogModule() {
  vi.resetModules()
  return import('../../../../server/utils/telegram/commanderCatalog')
}

beforeEach(() => {
  rpc.mockReset()
  rpc.mockResolvedValue({ data: CATALOG_ROWS, error: null })
  vi.stubGlobal('telegramServiceSupabaseClient', () => ({ rpc }))
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchCommanderCatalog', () => {
  it('maps the catalog rows, with no keywords when the column is null', async () => {
    const { fetchCommanderCatalog } = await loadCatalogModule()

    const { cards } = await fetchCommanderCatalog()

    expect(rpc).toHaveBeenCalledWith('get_commander_catalog')
    expect(cards[0]).toEqual({
      name: 'Cazur',
      scryfallId: 'id-cazur',
      partnerType: 'partner_with',
      keywords: [],
      partnerWithScryfallId: 'id-ukkima',
      artCropUrl: 'https://img/cazur.jpg'
    })
    expect(cards[1]?.keywords).toEqual(['Flying'])
  })

  it('builds the same partner rules the website uses', async () => {
    const { fetchCommanderCatalog } = await loadCatalogModule()

    const { rules } = await fetchCommanderCatalog()

    expect(rules.getExactPartnerName('Cazur')).toBe('Ukkima')
  })

  it('reads the catalog once, then serves it from memory', async () => {
    const { fetchCommanderCatalog } = await loadCatalogModule()

    const first = await fetchCommanderCatalog()
    const second = await fetchCommanderCatalog()

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('reads it again once the cache is older than ten minutes', async () => {
    const { fetchCommanderCatalog } = await loadCatalogModule()

    await fetchCommanderCatalog()
    vi.advanceTimersByTime(9 * 60 * 1000)
    await fetchCommanderCatalog()
    expect(rpc).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2 * 60 * 1000)
    await fetchCommanderCatalog()
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('fails when the catalog cannot be read, and does not cache the failure', async () => {
    const { fetchCommanderCatalog } = await loadCatalogModule()
    rpc.mockResolvedValueOnce({ data: null, error: new Error('rpc failed') })

    await expect(fetchCommanderCatalog()).rejects.toThrow('rpc failed')
    await expect(fetchCommanderCatalog()).resolves.toMatchObject({ cards: expect.any(Array) })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
