// server\utils\cardTrader.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Solo Magic: the Gathering per ora — vedi docs/PROGRESS.md, feasibility
// study CardTrader 2026-08-08.
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

// Il codice esatto è il caso comune (stampa della serie base): provandolo per
// primo si evita di scaricare gli export delle espansioni sorelle.
function orderExactFirst(expansions: { id: number, code: string }[], setCode: string): number[] {
  return [...expansions]
    .sort((a, b) => Number(b.code === setCode) - Number(a.code === setCode))
    .map(expansion => expansion.id)
}

// CardTrader non offre una ricerca per nome: bisogna prima risolvere
// l'expansion_id dal set_code, poi scaricare l'intero set di blueprint e
// filtrare per scryfall_id. La lista delle espansioni si cacheia per intero
// (compatta, riusata a ogni lookup) — vedi migrazione 20260808110000.
//
// Un set Scryfall però non mappa 1:1 su un'espansione CardTrader: loro lo
// spezzano prefissando il codice — dsk (base), cdsk (Collectors), adsk (Art
// Series), pdsk (Promos), predsk (Prerelease). Le stampe boosterfun/showcase,
// che Scryfall tiene sotto lo stesso `dsk` con collector number alto, stanno
// quindi in `cdsk`: cercare solo nel codice esatto le mancava sempre, in
// silenzio. Da qui la lista di candidate invece di un singolo id.
async function resolveExpansionIds(
  supabase: SupabaseClient<Database>,
  token: string,
  setCode: string
): Promise<number[]> {
  // `%dsk` copre sia il codice esatto sia le sorelle prefissate.
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

// Risolve scryfallId + setCode nell'id di scheda carta CardTrader, cacheando
// solo la riga trovata (non l'intero export del set, vedi migrazione
// 20260808110000 e commento in resolve.get.ts) — usata sia dal lookup
// on-demand (click su "Cerca su CardTrader") sia dal prefetch in background
// alla creazione/modifica di una wanted-card.
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

  for (const expansionId of expansionIds) {
    const blueprints = await $fetch<CardTraderBlueprint[]>(
      `${CARDTRADER_API_BASE}/blueprints/export`,
      {
        headers: { Authorization: `Bearer ${token}` },
        query: { expansion_id: expansionId }
      }
    )

    const match = blueprints.find(blueprint => blueprint.scryfall_id === scryfallId)
    if (!match) continue

    await supabase.from('pauperwave_cardtrader_blueprints').upsert({
      id: match.id,
      scryfall_id: scryfallId,
      expansion_id: match.expansion_id,
      name: match.name
    })

    return { blueprintId: match.id, url: `https://www.cardtrader.com/en/cards/${match.id}` }
  }

  return { blueprintId: null, url: null }
}
