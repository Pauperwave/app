// app\composables\commanders\useCommanderCatalogQuery.ts
// One cached fetch of the whole mtg_commanders catalog via the
// get_commander_catalog() RPC (migration 20260917000000) — ported from
// MagicTheGathering/league's useCommanderCatalogQuery.ts (user request,
// 2026-09-16). A plain `.select()` here would get silently truncated to
// PostgREST's 1000-row cap (the catalog is ~3000+ rows); the RPC wraps the
// whole result in json_agg so PostgREST sees exactly one row.
import type { Database } from '#shared/utils/types/database'

export interface CommanderCatalogRow {
  name: string
  scryfallId: string
  partnerType: string | null
  keywords: string[]
  partnerWithScryfallId: string | null
  manaCost: string | null
  cmc: number | null
  colorIdentity: string[]
  edhrecRank: number | null
  imageUrl: string | null
  artCropUrl: string | null
}

export const COMMANDER_CATALOG_KEY = ['commander-catalog']

// A month — the catalog only changes after a Scryfall resync or a manual
// correction, no reason to refetch on every commander-modal open. Unlike
// league (which opts specific queries into its cache-persister plugin),
// this app's colada.options.ts persists every query by default except a
// short PERSISTENCE_EXCLUDED_KEYS list — 'commander-catalog' isn't in it,
// so it's persisted automatically, no per-query wiring needed here.
const CATALOG_CACHE_TIME = 30 * 24 * 60 * 60 * 1000

interface CommanderCatalogRawRow {
  card_name: string
  scryfall_id: string
  partner_type: string | null
  keywords: string[] | null
  partner_with_scryfall_id: string | null
  mana_cost: string | null
  cmc: number | null
  color_identity: string[] | null
  edhrec_rank: number | null
  image_url: string | null
  art_crop_url: string | null
}

export function useCommanderCatalogQuery() {
  const supabase = useSupabaseClient<Database>()

  return useQuery({
    key: () => COMMANDER_CATALOG_KEY,
    query: async (): Promise<CommanderCatalogRow[]> => {
      const { data, error } = await supabase.rpc('get_commander_catalog')
      if (error) throw error

      return ((data ?? []) as unknown as CommanderCatalogRawRow[]).map(row => ({
        name: row.card_name,
        scryfallId: row.scryfall_id,
        partnerType: row.partner_type,
        keywords: row.keywords ?? [],
        partnerWithScryfallId: row.partner_with_scryfall_id,
        manaCost: row.mana_cost,
        cmc: row.cmc,
        colorIdentity: row.color_identity ?? [],
        edhrecRank: row.edhrec_rank,
        imageUrl: row.image_url,
        artCropUrl: row.art_crop_url
      }))
    },
    staleTime: CATALOG_CACHE_TIME,
    gcTime: CATALOG_CACHE_TIME
  })
}
