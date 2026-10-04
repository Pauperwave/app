// server\utils\commanders\catalogSync.ts
// The pure part of the commander catalog sync (server/api/admin/sync-commanders.post.ts): which
// Scryfall search to run, which of what came back is new, and what a new card becomes as a
// mtg_commanders row. Apart from the endpoint so these rules, partner types above all, are
// unit-tested.

import { newerPastDate, syncWindowStart } from './syncWindow'

// Cards of a set not yet out are not Commander-legal until its release, but players already use
// them at pre-release events: `date>now` brings them in ahead of the legality flip
const SCRYFALL_BASE_QUERY = 'is:commander lang:en -is:digital (legal:commander or date>now)'
const SYNC_LOOKBACK_DAYS = 30
const SCRYFALL_USER_AGENT = 'Pauperwave (https://app.pauperwave.org, commander catalog sync)'
// Two consecutive all-known pages before stopping, in case a release-date tie
// splits an already-known and a still-unknown card across a page boundary.
const CONSECUTIVE_KNOWN_PAGES_TO_STOP = 2
// Scryfall's API etiquette asks for 50-100ms between requests.
const REQUEST_PAUSE_MS = 100
// Above this many rows missing released_at, a full unscoped fetch (which backfills it) beats a date
// filter built on a mostly-empty catalog; below it, a few permanent stragglers can't force full
// fetches forever.
const BACKFILL_THRESHOLD = 50

export function buildSearchUrl(dateFrom?: string | null): string {
  const q = dateFrom ? `${SCRYFALL_BASE_QUERY} date>=${dateFrom}` : SCRYFALL_BASE_QUERY
  const params = new URLSearchParams({ q, unique: 'cards', order: 'released', dir: 'desc' })
  return `https://api.scryfall.com/cards/search?${params.toString()}`
}

export interface CatalogImageUris {
  normal?: string
  large?: string
  art_crop?: string
}

export interface CatalogCardFace {
  image_uris?: CatalogImageUris
  mana_cost?: string
  type_line?: string
  oracle_text?: string
}

export interface CatalogCard {
  id: string
  name: string
  released_at?: string
  image_uris?: CatalogImageUris
  card_faces?: CatalogCardFace[]
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

export interface CatalogSearchPage {
  data: CatalogCard[]
  has_more: boolean
  next_page?: string
}

export interface ExistingCatalog {
  scryfallIds: Set<string>
  names: Set<string>
  latestPastReleasedAt: string | null
  rowsNeedingReleasedAt: { scryfallId: string, cardName: string }[]
}

// How a sync starts: the whole set when the catalog is empty or mostly missing released_at (a
// full pass backfills it), otherwise only what was released since the last sync
export function planCatalogSync(
  existing: ExistingCatalog
): { needsFullFetch: boolean, startUrl: string } {
  const { latestPastReleasedAt } = existing

  if (latestPastReleasedAt === null || existing.rowsNeedingReleasedAt.length > BACKFILL_THRESHOLD) {
    return { needsFullFetch: true, startUrl: buildSearchUrl() }
  }

  return {
    needsFullFetch: false,
    startUrl: buildSearchUrl(syncWindowStart(latestPastReleasedAt, SYNC_LOOKBACK_DAYS))
  }
}

// Only the cards the catalog doesn't have. mtg_commanders is unique on card_name too, so a reprint
// (same name, new id) is skipped, and so is a same-name printing repeated within this batch
// (Un-sets, promos).
export function selectNewCards(
  fetched: CatalogCard[],
  existing: Pick<ExistingCatalog, 'scryfallIds' | 'names'>
): CatalogCard[] {
  const seenNames = new Set<string>()

  return fetched.filter((card) => {
    if (existing.scryfallIds.has(card.id) || existing.names.has(card.name)) return false
    if (seenNames.has(card.name)) return false

    seenNames.add(card.name)
    return true
  })
}

export function partnerTypeFor(
  card: CatalogCard,
  typeLine: string,
  keywords: string[]
): string | null {
  if (keywords.includes('Partner with')) return 'partner_with'
  if (keywords.includes('Choose a background')) return 'background_commander'
  if (keywords.includes('Doctor\'s companion')) return 'doctors_companion'
  if (/friends forever/i.test(card.oracle_text ?? '')) return 'friends_forever'
  if (typeLine.includes('Time Lord Doctor')) return 'doctor'
  if (keywords.includes('Partner')) return 'partner'
  if (typeLine.includes('Enchantment') && typeLine.includes('Background')) return 'background'
  return null
}

export function partnerTargetName(card: CatalogCard): string | null {
  const match = /Partner with ([^(]+)\(/.exec(card.oracle_text ?? '')
  return match?.[1]?.trim() ?? null
}

export interface MappedRow {
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

// A double-faced card keeps its images on its faces, a single-faced one on the card itself
export function frontImages(card: CatalogCard) {
  const front = card.card_faces?.[0]?.image_uris

  return {
    image_url: card.image_uris?.normal ?? front?.normal ?? null,
    large_image_url: card.image_uris?.large ?? front?.large ?? null,
    art_crop_url: card.image_uris?.art_crop ?? front?.art_crop ?? null
  }
}

export function backFace(card: CatalogCard) {
  const back = card.card_faces?.[1]

  return {
    back_image_url: back?.image_uris?.normal ?? null,
    back_large_image_url: back?.image_uris?.large ?? null,
    back_art_crop_url: back?.image_uris?.art_crop ?? null,
    back_mana_cost: back?.mana_cost ?? null,
    back_type_line: back?.type_line ?? null,
    back_oracle_text: back?.oracle_text ?? null
  }
}

export function mapCard(
  card: CatalogCard,
  syncedAt: string = new Date().toISOString()
): MappedRow {
  const frontFace = card.card_faces?.[0]
  const typeLine = card.type_line ?? frontFace?.type_line ?? ''
  const keywords = card.keywords ?? []

  return {
    scryfall_id: card.id,
    card_name: card.name,
    ...frontImages(card),
    ...backFace(card),
    mana_cost: card.mana_cost ?? frontFace?.mana_cost ?? null,
    cmc: card.cmc ?? 0,
    color_identity: card.color_identity ?? [],
    type_line: typeLine || null,
    keywords,
    oracle_text: card.oracle_text ?? frontFace?.oracle_text ?? null,
    partner_type: partnerTypeFor(card, typeLine, keywords),
    edhrec_rank: card.edhrec_rank ?? null,
    layout: card.layout,
    is_double_faced: (card.card_faces?.length ?? 0) > 1,
    scryfall_url: card.scryfall_uri ?? null,
    released_at: card.released_at ?? null,
    last_synced_at: syncedAt,
    partnerTargetName: partnerTargetName(card)
  }
}

// The rows to insert: "Partner with" always targets a card of the same release pass, so the
// target's id is looked up by name among the batch
export function buildInsertRows(newCards: CatalogCard[], syncedAt?: string) {
  const mapped = newCards.map(card => mapCard(card, syncedAt))
  const idByName = new Map(mapped.map(row => [row.card_name, row.scryfall_id]))

  return mapped.map(({ partnerTargetName: targetName, ...row }) => ({
    ...row,
    partner_with_scryfall_id: targetName ? idByName.get(targetName) ?? null : null
  }))
}

interface CatalogRow {
  scryfall_id: string
  card_name: string
  released_at: string | null
}

// What the endpoint needs to know about the catalog it is syncing: which cards it has (by id and
// by name), how far its release dates reach, and which rows still miss one
export function summarizeCatalog(rows: CatalogRow[], today: string): ExistingCatalog {
  const summary: ExistingCatalog = {
    scryfallIds: new Set(),
    names: new Set(),
    latestPastReleasedAt: null,
    rowsNeedingReleasedAt: []
  }

  for (const row of rows) {
    summary.scryfallIds.add(row.scryfall_id)
    summary.names.add(row.card_name)

    if (row.released_at) {
      summary.latestPastReleasedAt = newerPastDate(
        summary.latestPastReleasedAt, row.released_at, today
      )
    } else {
      summary.rowsNeedingReleasedAt.push({ scryfallId: row.scryfall_id, cardName: row.card_name })
    }
  }

  return summary
}

function pageHasNewCards(cards: CatalogCard[], existing: ExistingCatalog): boolean {
  return cards.some(card => !existing.scryfallIds.has(card.id) && !existing.names.has(card.name))
}

// $fetch is typed against Nitro's routes: a plain URL string sent it into "excessive stack depth"
// once the page's own next_page fed the next call, so the call is typed by hand
function fetchSearchPage(url: string): Promise<CatalogSearchPage> {
  const fetchJson = $fetch as unknown as (
    url: string, options: { headers: Record<string, string> }
  ) => Promise<CatalogSearchPage>

  return fetchJson(url, {
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })
}

const waitBetweenRequests = () => new Promise(resolve => setTimeout(resolve, REQUEST_PAUSE_MS))

/**
 * Pages through a Scryfall search. With `earlyStop`, stops after two pages with nothing new: only
 * safe on a date-scoped query, never on the full backfill pass.
 */
export async function fetchCommanderCards(
  startUrl: string,
  existing: ExistingCatalog,
  earlyStop: boolean,
  pause: () => Promise<unknown> = waitBetweenRequests
): Promise<{ cards: CatalogCard[], scanned: number }> {
  const cards: CatalogCard[] = []
  let consecutiveKnownPages = 0
  let url: string | undefined = startUrl

  while (url) {
    const page = await fetchSearchPage(url)
    cards.push(...page.data)

    consecutiveKnownPages = pageHasNewCards(page.data, existing) ? 0 : consecutiveKnownPages + 1
    if (earlyStop && consecutiveKnownPages >= CONSECUTIVE_KNOWN_PAGES_TO_STOP) break

    url = page.has_more ? page.next_page : undefined
    if (url) await pause()
  }

  return { cards, scanned: cards.length }
}
