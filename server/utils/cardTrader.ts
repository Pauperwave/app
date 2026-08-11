// server\utils\cardTrader.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Magic: the Gathering only for now — see docs/PROGRESS.md, CardTrader feasibility
// study 2026-08-08.
const MTG_GAME_ID = 1
const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2'

interface CardTraderExpansion {
  id: number
  game_id: number
  code: string
  name: string
}

interface CardTraderBlueprint {
  id: number
  name: string
  expansion_id: number
  scryfall_id?: string
}

export interface CardTraderResolution {
  blueprintId: number | null
  url: string | null
}

// The exact code is the common case (a base-set printing): trying it first avoids
// downloading the sibling expansions' exports.
function orderExactFirst(expansions: { id: number, code: string }[], setCode: string): number[] {
  return [...expansions]
    .sort((a, b) => Number(b.code === setCode) - Number(a.code === setCode))
    .map(expansion => expansion.id)
}

// CardTrader offers no search by name: the expansion_id has to be resolved from the
// set_code first, then the whole blueprint set downloaded and filtered by
// scryfall_id. The expansion list is cached in full (compact, reused on every
// lookup) — see migration 20260808110000.
//
// A Scryfall set does not map 1:1 onto a CardTrader expansion though: they split it
// by prefixing the code — dsk (base), cdsk (Collectors), adsk (Art Series), pdsk
// (Promos), predsk (Prerelease). Boosterfun/showcase printings, which Scryfall keeps
// under the same `dsk` with a high collector number, therefore live in `cdsk`:
// searching the exact code only missed them every time, silently. Hence the list of
// candidates instead of a single id.
async function resolveExpansionIds(
  supabase: SupabaseClient<Database>,
  token: string,
  setCode: string
): Promise<number[]> {
  // `%dsk` covers both the exact code and the prefixed siblings.
  const { data: cached } = await supabase
    .from('pauperwave_cardtrader_expansions')
    .select('id, code')
    .eq('game_id', MTG_GAME_ID)
    .ilike('code', `%${setCode}`)

  if (cached?.length) return orderExactFirst(cached, setCode)

  const expansions = await $fetch<CardTraderExpansion[]>(`${CARDTRADER_API_BASE}/expansions`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const mtgExpansions = expansions.filter(expansion => expansion.game_id === MTG_GAME_ID)

  if (mtgExpansions.length) {
    await supabase.from('pauperwave_cardtrader_expansions').upsert(
      mtgExpansions.map(expansion => ({
        id: expansion.id,
        code: expansion.code,
        name: expansion.name,
        game_id: expansion.game_id
      }))
    )
  }

  return orderExactFirst(
    mtgExpansions.filter(expansion => expansion.code.endsWith(setCode)),
    setCode
  )
}

async function cacheAndReturn(
  supabase: SupabaseClient<Database>,
  scryfallId: string,
  match: CardTraderBlueprint
): Promise<CardTraderResolution> {
  await supabase.from('pauperwave_cardtrader_blueprints').upsert({
    id: match.id,
    scryfall_id: scryfallId,
    expansion_id: match.expansion_id,
    name: match.name
  })

  return { blueprintId: match.id, url: `https://www.cardtrader.com/en/cards/${match.id}` }
}

// CardTrader does not always backfill a blueprint's scryfall_id right after a set
// releases: confirmed 2026-08-11 on "Commander: Marvel Super Heroes" (msc, released
// 2026-06-26), where over half of its 338 blueprints — including "Stilt-Man,
// Towering Terror" — still had scryfall_id: null. The name match below is the
// fallback for that gap.
async function fetchScryfallCardName(scryfallId: string): Promise<string | null> {
  const card = await $fetch<{ name?: string }>(`https://api.scryfall.com/cards/${scryfallId}`)
  return card.name ?? null
}

// Resolves scryfallId + setCode into the CardTrader card page id, caching only the
// row that was found (not the set's whole export, see migration 20260808110000 and
// the comment in resolve.get.ts) — used both by the on-demand lookup (clicking
// "Search on CardTrader") and by the background prefetch when a wanted card is
// created or edited.
export async function resolveCardTraderBlueprint(
  supabase: SupabaseClient<Database>,
  token: string,
  scryfallId: string,
  setCode: string
): Promise<CardTraderResolution> {
  const { data: cachedBlueprint } = await supabase
    .from('pauperwave_cardtrader_blueprints')
    .select('id')
    .eq('scryfall_id', scryfallId)
    .maybeSingle()

  if (cachedBlueprint) {
    return { blueprintId: cachedBlueprint.id, url: `https://www.cardtrader.com/en/cards/${cachedBlueprint.id}` }
  }

  const expansionIds = await resolveExpansionIds(supabase, token, setCode.toLowerCase())
  const blueprintsByExpansion: CardTraderBlueprint[][] = []

  for (const expansionId of expansionIds) {
    const blueprints = await $fetch<CardTraderBlueprint[]>(
      `${CARDTRADER_API_BASE}/blueprints/export`,
      {
        headers: { Authorization: `Bearer ${token}` },
        query: { expansion_id: expansionId }
      }
    )
    blueprintsByExpansion.push(blueprints)

    const match = blueprints.find(blueprint => blueprint.scryfall_id === scryfallId)
    if (match) return cacheAndReturn(supabase, scryfallId, match)
  }

  const cardName = await fetchScryfallCardName(scryfallId).catch(() => null)
  if (cardName) {
    for (const blueprints of blueprintsByExpansion) {
      const match = blueprints.find(blueprint => blueprint.name === cardName)
      if (match) return cacheAndReturn(supabase, scryfallId, match)
    }
  }

  return { blueprintId: null, url: null }
}
