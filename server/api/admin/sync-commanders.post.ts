// server\api\admin\sync-commanders.post.ts
// Incremental resync: fetches commander-eligible cards from Scryfall (paper, English,
// legal:commander, Backgrounds included), diffs against mtg_commanders and inserts ONLY the new
// rows. Never re-fetches or overwrites rows already synced, so manual corrections survive. Gated by
// requireManagementPermission.
//
// The common case is scoped with `date>=<max known released_at>`, so a routine resync only pages
// through cards released since the last sync instead of the whole ~3600-card set. released_at is
// NULL on pre-existing rows, so the first run does one full unscoped fetch that backfills it and
// detects new cards in the same pass.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

const SCRYFALL_BASE_QUERY = 'is:commander lang:en -is:digital legal:commander'
const SCRYFALL_USER_AGENT = 'Pauperwave (https://app.pauperwave.org, commander catalog sync)'
// Two consecutive all-known pages before stopping, in case a release-date tie
// splits an already-known and a still-unknown card across a page boundary.
const CONSECUTIVE_KNOWN_PAGES_TO_STOP = 2
// Above this many rows missing released_at, a full unscoped fetch (which backfills it) beats a date
// filter built on a mostly-empty catalog; below it, a few permanent stragglers can't force full
// fetches forever.
const BACKFILL_THRESHOLD = 50

function buildSearchUrl(dateFrom?: string | null): string {
  const q = dateFrom ? `${SCRYFALL_BASE_QUERY} date>=${dateFrom}` : SCRYFALL_BASE_QUERY
  const params = new URLSearchParams({ q, unique: 'cards', order: 'released', dir: 'desc' })
  return `https://api.scryfall.com/cards/search?${params.toString()}`
}

interface ScryfallImageUris {
  normal?: string
  large?: string
  art_crop?: string
}

interface ScryfallCardFace {
  image_uris?: ScryfallImageUris
  mana_cost?: string
  type_line?: string
  oracle_text?: string
}

interface ScryfallCard {
  id: string
  name: string
  released_at?: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
  mana_cost?: string
  cmc?: number
  color_identity?: string[]
  type_line?: string
  keywords?: string[]
  oracle_text?: string
  edhrec_rank?: number
  scryfall_uri?: string
  layout: string
}

interface ScryfallSearchPage {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
}

interface FetchResult {
  cards: ScryfallCard[]
  scanned: number
}

/**
 * Paginates a Scryfall search. With `earlyStop`, stops after `CONSECUTIVE_KNOWN_PAGES_TO_STOP`
 * pages with nothing new: only safe on a date-scoped query, never on the full backfill pass. /
 */
async function fetchCommanderCardsPaginated(
  startUrl: string,
  existing: ExistingCatalog,
  earlyStop: boolean
): Promise<FetchResult> {
  const cards: ScryfallCard[] = []
  let scanned = 0
  let consecutiveKnownPages = 0
  let url: string | undefined = startUrl

  while (url) {
    const page: ScryfallSearchPage = await $fetch(url, {
      headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
    })
    scanned += page.data.length
    cards.push(...page.data)

    if (earlyStop) {
      const pageHasNew = page.data.some(card =>
        !existing.scryfallIds.has(card.id) && !existing.names.has(card.name))
      consecutiveKnownPages = pageHasNew ? 0 : consecutiveKnownPages + 1
      if (consecutiveKnownPages >= CONSECUTIVE_KNOWN_PAGES_TO_STOP) break
    }

    url = page.has_more ? page.next_page : undefined
    // Scryfall's API etiquette asks for 50-100ms between requests.
    if (url) await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { cards, scanned }
}

interface ExistingCatalog {
  scryfallIds: Set<string>
  names: Set<string>
  maxReleasedAt: string | null
  rowsNeedingReleasedAt: { scryfallId: string, cardName: string }[]
}

// mtg_commanders is unique on scryfall_id AND card_name: a reprint (same name, new id) must be
// skipped by name too
async function fetchExistingCatalog(
  supabase: ReturnType<typeof serverSupabaseServiceRole<Database>>
): Promise<ExistingCatalog> {
  const scryfallIds = new Set<string>()
  const names = new Set<string>()
  const rowsNeedingReleasedAt: { scryfallId: string, cardName: string }[] = []
  let maxReleasedAt: string | null = null
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('mtg_commanders')
      .select('scryfall_id, card_name, released_at')
      .range(from, from + pageSize - 1)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    if (!data || data.length === 0) break

    for (const row of data) {
      scryfallIds.add(row.scryfall_id)
      names.add(row.card_name)
      if (row.released_at) {
        if (!maxReleasedAt || row.released_at > maxReleasedAt) maxReleasedAt = row.released_at
      } else {
        rowsNeedingReleasedAt.push({ scryfallId: row.scryfall_id, cardName: row.card_name })
      }
    }
    if (data.length < pageSize) break
    from += pageSize
  }

  return { scryfallIds, names, maxReleasedAt, rowsNeedingReleasedAt }
}

// Fills released_at for rows synced before it existed, matched by name against the fetch already in
// hand (not by scryfall_id: the stored printing may be excluded by `-is:digital`, so Scryfall picks
// a same-named one). No extra Scryfall requests.
async function backfillReleasedDates(
  supabase: ReturnType<typeof serverSupabaseServiceRole<Database>>,
  rowsNeedingReleasedAt: ExistingCatalog['rowsNeedingReleasedAt'],
  allFetchedCards: ScryfallCard[]
): Promise<number> {
  if (rowsNeedingReleasedAt.length === 0) return 0

  const releasedAtByName = new Map(allFetchedCards.map(card => [card.name, card.released_at]))
  const rowsToUpdate = rowsNeedingReleasedAt
    .map(row => ({
      scryfall_id: row.scryfallId,
      card_name: row.cardName,
      released_at: releasedAtByName.get(row.cardName)
    }))
    .filter((row): row is { scryfall_id: string, card_name: string, released_at: string } =>
      !!row.released_at)

  const chunkSize = 500
  for (let i = 0; i < rowsToUpdate.length; i += chunkSize) {
    const chunk = rowsToUpdate.slice(i, i + chunkSize)
    const { error } = await supabase.from('mtg_commanders').upsert(chunk, { onConflict: 'scryfall_id' })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return rowsToUpdate.length
}

function partnerTypeFor(card: ScryfallCard, typeLine: string, keywords: string[]): string | null {
  if (keywords.includes('Partner with')) return 'partner_with'
  if (keywords.includes('Choose a background')) return 'background_commander'
  if (keywords.includes('Doctor\'s companion')) return 'doctors_companion'
  if (/friends forever/i.test(card.oracle_text ?? '')) return 'friends_forever'
  if (typeLine.includes('Time Lord Doctor')) return 'doctor'
  if (keywords.includes('Partner')) return 'partner'
  if (typeLine.includes('Enchantment') && typeLine.includes('Background')) return 'background'
  return null
}

function partnerTargetName(card: ScryfallCard): string | null {
  const match = /Partner with ([^(]+)\(/.exec(card.oracle_text ?? '')
  return match?.[1]?.trim() ?? null
}

interface MappedRow {
  scryfall_id: string
  card_name: string
  image_url: string | null
  large_image_url: string | null
  art_crop_url: string | null
  back_image_url: string | null
  back_large_image_url: string | null
  back_art_crop_url: string | null
  mana_cost: string | null
  back_mana_cost: string | null
  cmc: number
  color_identity: string[]
  type_line: string | null
  back_type_line: string | null
  keywords: string[]
  oracle_text: string | null
  back_oracle_text: string | null
  partner_type: string | null
  edhrec_rank: number | null
  layout: string
  is_double_faced: boolean
  scryfall_url: string | null
  released_at: string | null
  last_synced_at: string
  partnerTargetName: string | null
}

function mapCard(card: ScryfallCard): MappedRow {
  const frontFace = card.card_faces?.[0]
  const backFace = card.card_faces?.[1]
  const typeLine = card.type_line ?? frontFace?.type_line ?? ''
  const keywords = card.keywords ?? []

  return {
    scryfall_id: card.id,
    card_name: card.name,
    image_url: card.image_uris?.normal ?? frontFace?.image_uris?.normal ?? null,
    large_image_url: card.image_uris?.large ?? frontFace?.image_uris?.large ?? null,
    art_crop_url: card.image_uris?.art_crop ?? frontFace?.image_uris?.art_crop ?? null,
    back_image_url: backFace?.image_uris?.normal ?? null,
    back_large_image_url: backFace?.image_uris?.large ?? null,
    back_art_crop_url: backFace?.image_uris?.art_crop ?? null,
    mana_cost: card.mana_cost ?? frontFace?.mana_cost ?? null,
    back_mana_cost: backFace?.mana_cost ?? null,
    cmc: card.cmc ?? 0,
    color_identity: card.color_identity ?? [],
    type_line: typeLine || null,
    back_type_line: backFace?.type_line ?? null,
    keywords,
    oracle_text: card.oracle_text ?? frontFace?.oracle_text ?? null,
    back_oracle_text: backFace?.oracle_text ?? null,
    partner_type: partnerTypeFor(card, typeLine, keywords),
    edhrec_rank: card.edhrec_rank ?? null,
    layout: card.layout,
    is_double_faced: (card.card_faces?.length ?? 0) > 1,
    scryfall_url: card.scryfall_uri ?? null,
    released_at: card.released_at ?? null,
    last_synced_at: new Date().toISOString(),
    partnerTargetName: partnerTargetName(card)
  }
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const existing = await fetchExistingCatalog(supabase)

  const needsFullFetch = existing.maxReleasedAt === null
    || existing.rowsNeedingReleasedAt.length > BACKFILL_THRESHOLD
  const startUrl = needsFullFetch ? buildSearchUrl() : buildSearchUrl(existing.maxReleasedAt)

  const { cards: fetchedCards, scanned } = await fetchCommanderCardsPaginated(
    startUrl, existing, !needsFullFetch
  )

  if (needsFullFetch) {
    await backfillReleasedDates(supabase, existing.rowsNeedingReleasedAt, fetchedCards)
  }

  // Unique on card_name too: dedupe same-name printings within this batch (Un-sets, promos)
  const seenNames = new Set<string>()
  const newCards = fetchedCards.filter((card) => {
    if (existing.scryfallIds.has(card.id) || existing.names.has(card.name)) return false
    if (seenNames.has(card.name)) return false
    seenNames.add(card.name)
    return true
  })

  if (newCards.length === 0) {
    return { added: 0, checked: scanned, cards: [] }
  }

  const mapped = newCards.map(mapCard)

  // name -> scryfall_id for the batch; "Partner with" always targets a card in the same release
  // pass
  const idByName = new Map(mapped.map(row => [row.card_name, row.scryfall_id]))

  const insertRows = mapped.map(({ partnerTargetName: targetName, ...row }) => ({
    ...row,
    partner_with_scryfall_id: targetName ? idByName.get(targetName) ?? null : null
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('mtg_commanders')
    .insert(insertRows)
    .select('card_name')

  if (insertError) {
    throw createError({ statusCode: 500, statusMessage: insertError.message })
  }

  return {
    added: inserted?.length ?? 0,
    checked: scanned,
    cards: (inserted ?? []).map(row => row.card_name)
  }
})
