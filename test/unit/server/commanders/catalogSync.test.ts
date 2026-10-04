// test\unit\server\commanders\catalogSync.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  backFace,
  buildInsertRows,
  buildSearchUrl,
  fetchCommanderCards,
  frontImages,
  mapCard,
  partnerTargetName,
  partnerTypeFor,
  planCatalogSync,
  selectNewCards,
  summarizeCatalog,
  type ExistingCatalog,
  type CatalogCard
} from '../../../../server/utils/commanders/catalogSync'

function card(overrides: Partial<CatalogCard> = {}): CatalogCard {
  return { id: 'id-1', name: 'Atraxa, Praetors\' Voice', layout: 'normal', ...overrides }
}

function catalog(overrides: Partial<ExistingCatalog> = {}): ExistingCatalog {
  return {
    scryfallIds: new Set(),
    names: new Set(),
    latestPastReleasedAt: '2026-09-15',
    rowsNeedingReleasedAt: [],
    ...overrides
  }
}

describe('partnerTypeFor', () => {
  const typeFor = (overrides: Partial<CatalogCard>, typeLine = 'Legendary Creature') =>
    partnerTypeFor(card(overrides), typeLine, overrides.keywords ?? [])

  it('tells "Partner with" from a plain Partner', () => {
    expect(typeFor({ keywords: ['Partner with'] })).toBe('partner_with')
    expect(typeFor({ keywords: ['Partner'] })).toBe('partner')
  })

  it('checks "Partner with" before Partner, whichever order the keywords come in', () => {
    expect(typeFor({ keywords: ['Partner', 'Partner with'] })).toBe('partner_with')
  })

  it('reads a background commander and a background', () => {
    expect(typeFor({ keywords: ['Choose a background'] })).toBe('background_commander')
    expect(partnerTypeFor(card(), 'Legendary Enchantment — Background', [])).toBe('background')
  })

  it('does not take any enchantment for a background', () => {
    expect(partnerTypeFor(card(), 'Legendary Enchantment', [])).toBeNull()
  })

  it('reads the Doctor pair', () => {
    expect(typeFor({ keywords: ['Doctor\'s companion'] })).toBe('doctors_companion')
    expect(partnerTypeFor(card(), 'Legendary Creature — Time Lord Doctor', [])).toBe('doctor')
  })

  it('reads friends forever from the rules text, in any case', () => {
    expect(typeFor({ oracle_text: 'Friends forever (You can have two commanders...)' }))
      .toBe('friends_forever')
    expect(typeFor({ oracle_text: 'FRIENDS FOREVER' })).toBe('friends_forever')
  })

  it('is null for a card with no pairing', () => {
    expect(typeFor({ keywords: ['Flying'] })).toBeNull()
  })
})

describe('partnerTargetName', () => {
  it('reads the card a "Partner with" names', () => {
    const rules = 'Partner with Tymna the Weaver (When this creature enters, target player may...)'

    expect(partnerTargetName(card({ oracle_text: rules }))).toBe('Tymna the Weaver')
  })

  it('is null without one', () => {
    expect(partnerTargetName(card({ oracle_text: 'Flying' }))).toBeNull()
    expect(partnerTargetName(card())).toBeNull()
  })
})

describe('mapCard', () => {
  it('takes the images, mana cost and rules from the card itself', () => {
    const row = mapCard(card({
      image_uris: { normal: 'n', large: 'l', art_crop: 'a' },
      mana_cost: '{W}{U}{B}{G}',
      oracle_text: 'Flying',
      cmc: 4
    }), '2026-10-04T00:00:00.000Z')

    expect(row).toMatchObject({
      image_url: 'n',
      large_image_url: 'l',
      art_crop_url: 'a',
      mana_cost: '{W}{U}{B}{G}',
      oracle_text: 'Flying',
      cmc: 4,
      is_double_faced: false,
      last_synced_at: '2026-10-04T00:00:00.000Z'
    })
  })

  it('takes the front from the first face and the back from the second on a double-faced card', () => {
    const row = mapCard(card({
      layout: 'transform',
      card_faces: [
        { image_uris: { normal: 'front' }, mana_cost: '{1}{R}', type_line: 'Legendary Creature' },
        { image_uris: { normal: 'back', art_crop: 'back-art' }, mana_cost: '', type_line: 'Planeswalker' }
      ]
    }))

    expect(row).toMatchObject({
      image_url: 'front',
      mana_cost: '{1}{R}',
      type_line: 'Legendary Creature',
      back_image_url: 'back',
      back_art_crop_url: 'back-art',
      back_type_line: 'Planeswalker',
      is_double_faced: true
    })
  })

  it('has safe defaults for what Scryfall leaves out', () => {
    const row = mapCard(card())

    expect(row).toMatchObject({
      image_url: null,
      mana_cost: null,
      type_line: null,
      cmc: 0,
      color_identity: [],
      keywords: [],
      edhrec_rank: null,
      released_at: null
    })
  })
})

describe('selectNewCards', () => {
  it('drops a card the catalog already has, by id', () => {
    const fetched = [card({ id: 'a', name: 'A' }), card({ id: 'b', name: 'B' })]

    expect(selectNewCards(fetched, catalog({ scryfallIds: new Set(['a']) })).map(c => c.id))
      .toEqual(['b'])
  })

  it('drops a reprint under a new id: the catalog is unique on the name too', () => {
    const fetched = [card({ id: 'new-id', name: 'Known' })]

    expect(selectNewCards(fetched, catalog({ names: new Set(['Known']) }))).toEqual([])
  })

  it('keeps one printing of a name repeated within the batch', () => {
    const fetched = [
      card({ id: 'first', name: 'Twin' }),
      card({ id: 'second', name: 'Twin' }),
      card({ id: 'other', name: 'Other' })
    ]

    expect(selectNewCards(fetched, catalog()).map(c => c.id)).toEqual(['first', 'other'])
  })
})

describe('buildInsertRows', () => {
  it('points a "Partner with" card at its partner from the same batch', () => {
    const rows = buildInsertRows([
      card({
        id: 'tymna',
        name: 'Tymna the Weaver',
        keywords: ['Partner with'],
        oracle_text: 'Partner with Thrasios, Triton Hero (When this...)'
      }),
      card({ id: 'thrasios', name: 'Thrasios, Triton Hero' })
    ])

    expect(rows.find(row => row.card_name === 'Tymna the Weaver')?.partner_with_scryfall_id)
      .toBe('thrasios')
  })

  it('leaves the partner empty when it is not in the batch', () => {
    const [row] = buildInsertRows([
      card({ keywords: ['Partner with'], oracle_text: 'Partner with Somebody Else (When...)' })
    ])

    expect(row?.partner_with_scryfall_id).toBeNull()
  })

  it('never leaks the helper field into the row to insert', () => {
    const [row] = buildInsertRows([card()])

    expect(row).not.toHaveProperty('partnerTargetName')
  })
})

describe('planCatalogSync', () => {
  it('fetches everything when the catalog is empty', () => {
    const plan = planCatalogSync(catalog({ latestPastReleasedAt: null }))

    expect(plan.needsFullFetch).toBe(true)
    expect(plan.startUrl).toBe(buildSearchUrl())
  })

  it('fetches everything when many rows still miss their release date', () => {
    const missing = Array.from({ length: 51 }, (_, index) => ({
      scryfallId: `id-${index}`, cardName: `Card ${index}`
    }))

    expect(planCatalogSync(catalog({ rowsNeedingReleasedAt: missing })).needsFullFetch).toBe(true)
  })

  it('tolerates a few stragglers without a release date', () => {
    const missing = Array.from({ length: 50 }, (_, index) => ({
      scryfallId: `id-${index}`, cardName: `Card ${index}`
    }))

    expect(planCatalogSync(catalog({ rowsNeedingReleasedAt: missing })).needsFullFetch).toBe(false)
  })

  it('otherwise starts 30 days before the latest past release', () => {
    const plan = planCatalogSync(catalog({ latestPastReleasedAt: '2026-09-15' }))

    expect(plan.needsFullFetch).toBe(false)
    expect(plan.startUrl).toBe(buildSearchUrl('2026-08-16'))
  })
})

describe('buildSearchUrl', () => {
  it('asks for commander-eligible English paper cards, legal now or not yet out', () => {
    const url = new URL(buildSearchUrl())

    expect(url.searchParams.get('q')).toBe(
      'is:commander lang:en -is:digital (legal:commander or date>now)'
    )
    expect(url.searchParams.get('order')).toBe('released')
  })

  it('limits the search to a date when given one', () => {
    expect(new URL(buildSearchUrl('2026-08-16')).searchParams.get('q')).toContain('date>=2026-08-16')
  })
})

describe('summarizeCatalog', () => {
  const row = (id: string, name: string, releasedAt: string | null) => ({
    scryfall_id: id, card_name: name, released_at: releasedAt
  })

  it('collects the ids and the names the catalog already has', () => {
    const summary = summarizeCatalog([row('a', 'A', '2026-01-01'), row('b', 'B', '2026-02-01')], '2026-10-04')

    expect([...summary.scryfallIds]).toEqual(['a', 'b'])
    expect([...summary.names]).toEqual(['A', 'B'])
  })

  it('reaches as far as the latest release that is already past', () => {
    const summary = summarizeCatalog([
      row('a', 'A', '2026-09-15'),
      row('b', 'B', '2026-08-01'),
      // spoiled with a future date: it must not push the window past cards that release sooner
      row('c', 'C', '2026-11-09')
    ], '2026-10-04')

    expect(summary.latestPastReleasedAt).toBe('2026-09-15')
  })

  it('has no reach when no card has a past release date', () => {
    expect(summarizeCatalog([row('a', 'A', '2026-11-09')], '2026-10-04').latestPastReleasedAt)
      .toBeNull()
    expect(summarizeCatalog([], '2026-10-04').latestPastReleasedAt).toBeNull()
  })

  it('lists the rows that still miss a release date', () => {
    const summary = summarizeCatalog([row('a', 'A', null), row('b', 'B', '2026-01-01')], '2026-10-04')

    expect(summary.rowsNeedingReleasedAt).toEqual([{ scryfallId: 'a', cardName: 'A' }])
  })
})

describe('fetchCommanderCards', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Answers each URL with its page: { data, next }
  function stubPages(pages: Record<string, { data: CatalogCard[], next?: string }>) {
    const requested: string[] = []
    vi.stubGlobal('$fetch', async (url: string) => {
      requested.push(url)
      const page = pages[url]
      return { data: page?.data ?? [], has_more: !!page?.next, next_page: page?.next }
    })
    return requested
  }

  const noPause = async () => {}

  it('follows next_page until the last page, pausing between requests', async () => {
    const requested = stubPages({
      p1: { data: [card({ id: 'a', name: 'A' })], next: 'p2' },
      p2: { data: [card({ id: 'b', name: 'B' })] }
    })
    const pause = vi.fn(async () => {})

    const result = await fetchCommanderCards('p1', catalog(), false, pause)

    expect(requested).toEqual(['p1', 'p2'])
    expect(result.cards.map(c => c.id)).toEqual(['a', 'b'])
    expect(result.scanned).toBe(2)
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('stops after two pages with nothing new when scoped by date', async () => {
    const known = catalog({ scryfallIds: new Set(['a', 'b', 'c']), names: new Set(['A', 'B', 'C']) })
    const requested = stubPages({
      p1: { data: [card({ id: 'a', name: 'A' })], next: 'p2' },
      p2: { data: [card({ id: 'b', name: 'B' })], next: 'p3' },
      p3: { data: [card({ id: 'c', name: 'C' })] }
    })

    const result = await fetchCommanderCards('p1', known, true, noPause)

    expect(requested).toEqual(['p1', 'p2'])
    expect(result.scanned).toBe(2)
  })

  it('goes on past known pages when a new card shows up in between', async () => {
    const known = catalog({ scryfallIds: new Set(['a', 'c']), names: new Set(['A', 'C']) })
    const requested = stubPages({
      p1: { data: [card({ id: 'a', name: 'A' })], next: 'p2' },
      p2: { data: [card({ id: 'new', name: 'New' })], next: 'p3' },
      p3: { data: [card({ id: 'c', name: 'C' })] }
    })

    await fetchCommanderCards('p1', known, true, noPause)

    expect(requested).toEqual(['p1', 'p2', 'p3'])
  })

  it('never stops early on the full pass', async () => {
    const known = catalog({ scryfallIds: new Set(['a', 'b', 'c']), names: new Set(['A', 'B', 'C']) })
    const requested = stubPages({
      p1: { data: [card({ id: 'a', name: 'A' })], next: 'p2' },
      p2: { data: [card({ id: 'b', name: 'B' })], next: 'p3' },
      p3: { data: [card({ id: 'c', name: 'C' })] }
    })

    await fetchCommanderCards('p1', known, false, noPause)

    expect(requested).toEqual(['p1', 'p2', 'p3'])
  })
})

describe('face helpers', () => {
  it('reads the front images from the card, or from its first face', () => {
    expect(frontImages(card({ image_uris: { normal: 'n', large: 'l', art_crop: 'a' } })))
      .toEqual({ image_url: 'n', large_image_url: 'l', art_crop_url: 'a' })
    expect(frontImages(card({ card_faces: [{ image_uris: { normal: 'f-n' } }] })))
      .toEqual({ image_url: 'f-n', large_image_url: null, art_crop_url: null })
  })

  it('prefers the card images over a face', () => {
    expect(frontImages(card({
      image_uris: { normal: 'card' }, card_faces: [{ image_uris: { normal: 'face' } }]
    })).image_url).toBe('card')
  })

  it('has no front images without any', () => {
    expect(frontImages(card()))
      .toEqual({ image_url: null, large_image_url: null, art_crop_url: null })
  })

  it('reads the back from the second face only', () => {
    expect(backFace(card({
      card_faces: [
        { image_uris: { normal: 'front' }, type_line: 'Front' },
        {
          image_uris: { normal: 'b-n', large: 'b-l', art_crop: 'b-a' },
          mana_cost: '{2}',
          type_line: 'Back',
          oracle_text: 'Back text'
        }
      ]
    }))).toEqual({
      back_image_url: 'b-n',
      back_large_image_url: 'b-l',
      back_art_crop_url: 'b-a',
      back_mana_cost: '{2}',
      back_type_line: 'Back',
      back_oracle_text: 'Back text'
    })
  })

  it('has no back on a single-faced card', () => {
    expect(Object.values(backFace(card())).every(value => value === null)).toBe(true)
  })
})
