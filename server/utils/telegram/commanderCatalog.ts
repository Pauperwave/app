// server\utils\telegram\commanderCatalog.ts
// The commander catalog (mtg_commanders, via get_commander_catalog()) for the bot: the partner
// rules the website applies (shared/utils/commanders/commanderPartnerRules.ts) plus what a
// second-commander inline result needs. ~3000 rows and it only changes on a resync, so it is kept
// in memory for a few minutes per warm instance instead of being read on every message.
import {
  createPartnerRules, type PartnerRuleCard
} from '#shared/utils/commanders/commanderPartnerRules'

export interface BotCatalogCard extends PartnerRuleCard {
  artCropUrl: string | null
}

export interface BotCommanderCatalog {
  cards: BotCatalogCard[]
  rules: ReturnType<typeof createPartnerRules>
}

interface CatalogRawRow {
  card_name: string
  scryfall_id: string
  partner_type: string | null
  keywords: string[] | null
  partner_with_scryfall_id: string | null
  art_crop_url: string | null
}

const CATALOG_TTL_MS = 10 * 60 * 1000

let cached: { loadedAt: number, catalog: BotCommanderCatalog } | null = null

export async function fetchCommanderCatalog(): Promise<BotCommanderCatalog> {
  if (cached && Date.now() - cached.loadedAt < CATALOG_TTL_MS) return cached.catalog

  const { data, error } = await telegramServiceSupabaseClient().rpc('get_commander_catalog')
  if (error) throw error

  const cards = ((data ?? []) as unknown as CatalogRawRow[]).map(row => ({
    name: row.card_name,
    scryfallId: row.scryfall_id,
    partnerType: row.partner_type,
    keywords: row.keywords ?? [],
    partnerWithScryfallId: row.partner_with_scryfall_id,
    artCropUrl: row.art_crop_url
  }))

  const catalog = { cards, rules: createPartnerRules(cards) }
  cached = { loadedAt: Date.now(), catalog }
  return catalog
}
