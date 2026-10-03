// server\utils\cardTrader.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Magic: the Gathering only for now (see docs/PROGRESS.md, CardTrader feasibility study)
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

// The exact code is the common case (a base-set printing): trying it first avoids downloading the
// sibling expansions' exports
function orderExactFirst(expansions: { id: number, code: string }[], setCode: string): number[] {
  return [...expansions]
    .sort((a, b) => Number(b.code === setCode) - Number(a.code === setCode))
    .map(expansion => expansion.id)
}

// CardTrader has no search by name: the expansion_id is resolved from the set_code, then the whole
// blueprint set is downloaded and filtered by scryfall_id. The expansion list is cached in full
// (see migration 20260808110000).
//
// A Scryfall set maps onto several CardTrader expansions, split by code prefix: dsk (base), cdsk
// (Collectors), adsk (Art Series), pdsk (Promos), predsk (Prerelease). Showcase printings live in
// `cdsk`, which an exact-code search silently missed, hence a list of candidates.
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

// CardTrader doesn't always backfill a blueprint's scryfall_id right after a set releases (e.g.
// over half of "Commander: Marvel Super Heroes"), so the name match below is the fallback
async function fetchScryfallCardName(scryfallId: string): Promise<string | null> {
  const card = await $fetch<{ name?: string }>(`https://api.scryfall.com/cards/${scryfallId}`)
  return card.name ?? null
}

// Resolves scryfallId + setCode into the CardTrader card page id, caching only the row found (not
// the set's whole export, see resolve.get.ts); used by the on-demand lookup and the prefetch on
// create/edit
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

// Shared by resolve.get.ts and price.get.ts: same query validation and service-role/token setup;
// what to do without a token differs (resolve: hard error, price: null price) and stays in each
// endpoint
export async function resolveCardTraderRequestContext(event: H3Event) {
  await requireUser(event)

  const { scryfallId, setCode } = getQuery<{ scryfallId?: string, setCode?: string }>(event)
  if (!scryfallId || !setCode) {
    throw createError({
      statusCode: 400,
      statusMessage: 'scryfallId e setCode sono richiesti'
    })
  }

  return {
    scryfallId,
    setCode,
    token: useRuntimeConfig(event).cardTraderApiToken,
    supabase: serverSupabaseServiceRole<Database>(event)
  }
}
