// scripts\refresh-wanted-cards-prices.mjs
// One-off/scheduled batch job (weekly via .github/workflows/
// refresh-wanted-cards-prices.yml): refreshes cardmarket_price and
// cardtrader_price for every wanted card still "searching" (see the 2026-08-08
// discussion in docs/PROGRESS.md — they are snapshots, not live prices, which is
// why a periodic refresh is needed instead of recomputing on every read).
//
// It duplicates the logic of server/utils/cardTrader.ts and
// server/utils/priceRefresh.ts rather than importing it: those modules are
// auto-imported by Nitro inside the Nuxt runtime and cannot be resolved from a
// standalone node script (the same reason geocode-associates.mjs does not reuse
// server-side code).
//
// Usage:
//   node --env-file=.env scripts/refresh-wanted-cards-prices.mjs
//   node --env-file=.env scripts/refresh-wanted-cards-prices.mjs --all   (include found/abandoned too)

// fallow-ignore-file code-duplication -- mirrors server/utils/cardTrader.ts and
// server/utils/priceRefresh.ts on purpose, see the file header comment above
// fallow-ignore-file security-sink -- the fetch() calls (fallow security, ssrf
// candidates) always hit a hardcoded api.scryfall.com/cardtrader host; only the
// path segment or query string is built from card data, the host is never
// attacker-controllable, and this is an offline admin script anyway, not an
// HTTP-reachable endpoint
import { createSupabaseAdminClient, sleep } from './lib/supabaseAdminClient.mjs'

const CARDTRADER_API_TOKEN = process.env.CARDTRADER_API_TOKEN
if (!CARDTRADER_API_TOKEN) {
  console.warn('Missing CARDTRADER_API_TOKEN — cardtrader_price will be skipped for every row.')
}

const supabase = createSupabaseAdminClient()

const MTG_GAME_ID = 1
const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2'
const SCRYFALL_USER_AGENT = 'Pauperwave-app/1.0 (wanted-cards weekly price refresh; contact: emanuelenardi.dev@gmail.com)'

// Scryfall asks for at most 10 requests/sec and a "polite" delay between calls:
// https://scryfall.com/docs/api#rate-limits-and-good-citizenship. CardTrader has a
// 10 req/sec limit on the marketplace/products endpoint — the same delay works for
// both calls made per row.
const REQUEST_DELAY_MS = 150

// The finish has to be inferred from the printing, not just from the request's
// treatment: foil-only printings exist (Pramikon, Sky Rampart in c19; Duskmourn's
// Japanese showcases) where prices.eur is null by construction and the price lives
// in prices.eur_foil. Reading only .eur returned null on those cards — and the same
// effectiveFoil is needed by CardTrader, which would otherwise filter on
// mtg_foil=false for a card that never existed in non-foil.
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

// A Scryfall set does not map 1:1 onto a CardTrader expansion: they split it by
// prefixing the code — dsk (base), cdsk (Collectors), adsk (Art Series), pdsk
// (Promos), predsk (Prerelease). Boosterfun/showcase printings, which Scryfall keeps
// under the same `dsk` with a high collector number, therefore live in `cdsk`:
// searching the exact code only missed them every time.
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

// CardTrader does not always backfill a blueprint's scryfall_id right after a set
// releases (confirmed 2026-08-11 on "Commander: Marvel Super Heroes", msc — over
// half of its 338 blueprints, including "Stilt-Man, Towering Terror", still had
// scryfall_id: null) — the name match below is the fallback for that gap. Mirrors
// server/utils/cardTrader.ts's resolveCardTraderBlueprint, which this script's own
// header comment says it duplicates but this fallback was missing until 2026-09-02
// (found investigating #51 "Stilt-Man" and #64 "Price of Glory" both stuck with no
// cardtrader_price and no cached blueprint row).
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

// Language is filtered here and no longer via query param (hardcoded
// `language=en`): that default made the two prices incomparable, because
// Scryfall/CardMarket quote the product in any language while we asked for English
// copies only. On a japanshowcase printing (e.g. Enduring Vitality dsk/394) the
// difference was 4× — scarce in English, not a lookup error. `language` null =
// "Any": no filter, global minimum.
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
  // --all: include found/abandoned too — for an occasional one-off run (e.g. after
  // backfilling scryfall_id/set_code on old requests), not for the weekly cron,
  // which stays targeted at active searches only.
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
    // Fall back to the treatment when Scryfall does not answer: better than
    // nothing, and it is how the job behaved before it knew about finishes.
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
