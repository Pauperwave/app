// scripts\refresh-wanted-cards-prices.mjs
// Weekly batch job (.github/workflows/refresh-wanted-cards-prices.yml): refreshes the
// cardmarket_price/cardtrader_price snapshots of every wanted card still "searching".
//
// Duplicates server/utils/cardTrader.ts and server/utils/priceRefresh.ts on purpose: those rely on
// Nitro auto-imports and can't be resolved from a standalone node script.
//
// Usage:
//   node --env-file=.env scripts/refresh-wanted-cards-prices.mjs
//   node --env-file=.env scripts/refresh-wanted-cards-prices.mjs --all   (include found/abandoned
//   too)

// fallow-ignore-file code-duplication -- mirrors the server utils on purpose, see the header above
// fallow-ignore-file security-sink -- fixed Scryfall/CardTrader hosts, path/query are card data
import { createSupabaseAdminClient, sleep } from './lib/supabaseAdminClient.mjs'

const CARDTRADER_API_TOKEN = process.env.CARDTRADER_API_TOKEN
if (!CARDTRADER_API_TOKEN) {
  console.warn('Missing CARDTRADER_API_TOKEN — cardtrader_price will be skipped for every row.')
}

const supabase = createSupabaseAdminClient()

const MTG_GAME_ID = 1
const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2'
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (wanted-cards weekly price refresh; contact: emanuelenardi.dev@gmail.com)'

// Scryfall (https://scryfall.com/docs/api#rate-limits-and-good-citizenship) and CardTrader's
// marketplace/products endpoint both allow 10 req/sec; one delay covers both calls per row
const REQUEST_DELAY_MS = 150

// The finish is inferred from the printing, not just the requested treatment: foil-only
// printings have prices.eur null and the price in prices.eur_foil. The same effectiveFoil
// is reused for CardTrader, which would otherwise filter on mtg_foil=false for a foil-only card.
async function fetchCardmarketPrice(scryfallId, wantsFoil) {
  const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })
  if (!response.ok) throw new Error(`Scryfall request failed: ${response.status} ${response.statusText}`)

  const card = await response.json()
  const effectiveFoil = wantsFoil || !(card.finishes ?? []).includes('nonfoil')

  const raw = effectiveFoil ? card.prices?.eur_foil : card.prices?.eur
  if (!raw) return { price: null, effectiveFoil }
  const parsed = Number(raw)
  return { price: Number.isFinite(parsed) ? parsed : null, effectiveFoil }
}

// The exact code is the common case (a base-set printing): trying it first avoids
// downloading the sibling expansions' exports.
function orderExactFirst(expansions, setCode) {
  return [...expansions]
    .sort((a, b) => Number(b.code === setCode) - Number(a.code === setCode))
    .map(expansion => expansion.id)
}

// A Scryfall set maps onto several CardTrader expansions, split by code prefix: dsk (base),
// cdsk (Collectors), adsk (Art Series), pdsk (Promos), predsk (Prerelease). Showcase printings
// therefore live in `cdsk`, which an exact-code search always missed.
async function resolveExpansionIds(setCode) {
  // `%dsk` covers both the exact code and the prefixed siblings.
  const { data: cached } = await supabase
    .from('pauperwave_cardtrader_expansions')
    .select('id, code')
    .eq('game_id', MTG_GAME_ID)
    .ilike('code', `%${setCode}`)

  if (cached?.length) return orderExactFirst(cached, setCode)

  const response = await fetch(`${CARDTRADER_API_BASE}/expansions`, {
    headers: { Authorization: `Bearer ${CARDTRADER_API_TOKEN}` }
  })
  if (!response.ok) throw new Error(`CardTrader expansions request failed: ${response.status}`)

  const expansions = await response.json()
  const mtgExpansions = expansions.filter(expansion => expansion.game_id === MTG_GAME_ID)

  if (mtgExpansions.length) {
    await supabase.from('pauperwave_cardtrader_expansions').upsert(
      mtgExpansions.map(expansion => ({
        id: expansion.id, code: expansion.code, name: expansion.name, game_id: expansion.game_id
      }))
    )
  }

  return orderExactFirst(
    mtgExpansions.filter(expansion => expansion.code.endsWith(setCode)),
    setCode
  )
}

// CardTrader doesn't always backfill a blueprint's scryfall_id right after a set releases, so the
// name match below is the fallback. Mirrors resolveCardTraderBlueprint in
// server/utils/cardTrader.ts.
async function fetchScryfallCardName(scryfallId) {
  const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })
  if (!response.ok) return null
  const card = await response.json()
  return card.name ?? null
}

async function resolveBlueprintId(scryfallId, setCode) {
  const { data: cached } = await supabase
    .from('pauperwave_cardtrader_blueprints')
    .select('id')
    .eq('scryfall_id', scryfallId)
    .maybeSingle()

  if (cached) return cached.id

  const expansionIds = await resolveExpansionIds(setCode.toLowerCase())
  const blueprintsByExpansion = []

  for (const expansionId of expansionIds) {
    const response = await fetch(`${CARDTRADER_API_BASE}/blueprints/export?expansion_id=${expansionId}`, {
      headers: { Authorization: `Bearer ${CARDTRADER_API_TOKEN}` }
    })
    if (!response.ok) throw new Error(`CardTrader blueprints request failed: ${response.status}`)

    const blueprints = await response.json()
    blueprintsByExpansion.push(blueprints)

    const match = blueprints.find(blueprint => blueprint.scryfall_id === scryfallId)
    if (match) {
      await supabase.from('pauperwave_cardtrader_blueprints').upsert({
        id: match.id, scryfall_id: scryfallId, expansion_id: match.expansion_id, name: match.name
      })
      return match.id
    }
  }

  const cardName = await fetchScryfallCardName(scryfallId).catch(() => null)
  if (cardName) {
    for (const blueprints of blueprintsByExpansion) {
      const match = blueprints.find(blueprint => blueprint.name === cardName)
      if (match) {
        await supabase.from('pauperwave_cardtrader_blueprints').upsert({
          id: match.id, scryfall_id: scryfallId, expansion_id: match.expansion_id, name: match.name
        })
        return match.id
      }
    }
  }

  return null
}

// `language` null = "Any": no filter, global minimum. Forcing English made the price
// incomparable with Scryfall/CardMarket, which quote any language.
async function fetchCardtraderPrice(blueprintId, foil, language) {
  const response = await fetch(
    `${CARDTRADER_API_BASE}/marketplace/products?blueprint_id=${blueprintId}`,
    { headers: { Authorization: `Bearer ${CARDTRADER_API_TOKEN}` } }
  )
  if (!response.ok) throw new Error(`CardTrader marketplace request failed: ${response.status}`)

  const body = await response.json()
  const products = body[String(blueprintId)] ?? []
  const eligible = products.filter(product =>
    product.properties_hash.condition === 'Near Mint'
    && product.properties_hash.mtg_foil === foil
    && (!language || product.properties_hash.mtg_language === language))

  if (!eligible.length) return null
  return Math.min(...eligible.map(product => product.price_cents)) / 100
}

async function main() {
  // --all also includes found/abandoned: for one-off runs, not the weekly cron
  const includeAllStatuses = process.argv.includes('--all')

  let query = supabase
    .from('pauperwave_wanted_cards')
    .select('id, card_name, scryfall_id, set_code, treatment, language')
    .not('scryfall_id', 'is', null)
    .not('set_code', 'is', null)

  if (!includeAllStatuses) query = query.eq('status', 'searching')

  const { data: rows, error } = await query

  if (error) throw error

  console.log(`${rows.length} wanted card(s) to refresh${includeAllStatuses ? ' (all statuses)' : ''}.`)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const wantsFoil = row.treatment.includes('foil')
    let cardmarketPrice = null
    let cardtraderPrice = null
    // Fall back to the requested treatment when Scryfall doesn't answer
    let effectiveFoil = wantsFoil

    try {
      const result = await fetchCardmarketPrice(row.scryfall_id, wantsFoil)
      cardmarketPrice = result.price
      effectiveFoil = result.effectiveFoil
    } catch (err) {
      console.error(`CardMarket price failed for #${row.id} "${row.card_name}":`, err.message)
    }
    await sleep(REQUEST_DELAY_MS)

    if (CARDTRADER_API_TOKEN) {
      try {
        const blueprintId = await resolveBlueprintId(row.scryfall_id, row.set_code)
        if (blueprintId) {
          cardtraderPrice = await fetchCardtraderPrice(blueprintId, effectiveFoil, row.language)
        }
      } catch (err) {
        console.error(`CardTrader price failed for #${row.id} "${row.card_name}":`, err.message)
      }
      await sleep(REQUEST_DELAY_MS)
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('pauperwave_wanted_cards')
      .update({
        cardmarket_price: cardmarketPrice,
        cardmarket_price_synced_at: cardmarketPrice !== null ? now : null,
        cardtrader_price: cardtraderPrice,
        cardtrader_price_synced_at: cardtraderPrice !== null ? now : null
      })
      .eq('id', row.id)

    if (updateError) {
      console.error(`DB update failed for #${row.id} "${row.card_name}":`, updateError.message)
      skipped++
      continue
    }

    updated++
    console.log(`#${row.id} "${row.card_name}" -> cardmarket=${cardmarketPrice ?? '—'} cardtrader=${cardtraderPrice ?? '—'}`)
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
