// scripts\refresh-wanted-cards-prices.mjs
// One-off/scheduled batch job (weekly via .github/workflows/
// refresh-wanted-cards-prices.yml): aggiorna cardmarket_price e
// cardtrader_price per ogni wanted-card ancora "searching" (vedi discussione
// 2026-08-08, docs/PROGRESS.md — sono snapshot, non prezzi live, per questo
// serve un refresh periodico invece di ricalcolarli a ogni lettura).
//
// Duplica la logica di server/utils/cardTrader.ts e
// server/utils/priceRefresh.ts invece di importarla: quei moduli sono
// auto-importati da Nitro dentro il runtime Nuxt, non risolvibili da uno
// script node standalone (stesso motivo per cui geocode-associates.mjs non
// riusa codice lato server).
//
// Usage:
//   node --env-file=.env scripts/refresh-wanted-cards-prices.mjs
//   node --env-file=.env scripts/refresh-wanted-cards-prices.mjs --all   (include found/abandoned too)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CARDTRADER_API_TOKEN = process.env.CARDTRADER_API_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment (see .env).')
  process.exit(1)
}
if (!CARDTRADER_API_TOKEN) {
  console.warn('Missing CARDTRADER_API_TOKEN — cardtrader_price will be skipped for every row.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const MTG_GAME_ID = 1
const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2'
const SCRYFALL_USER_AGENT = 'PauperWave-app/1.0 (wanted-cards weekly price refresh; contact: emanuelenardi.dev@gmail.com)'

// Scryfall chiede max 10 richieste/sec e un delay "gentile" tra le chiamate:
// https://scryfall.com/docs/api#rate-limits-and-good-citizenship. CardTrader
// ha un limite di 10 req/sec sull'endpoint marketplace/products — stesso
// delay va bene per entrambe le chiamate fatte per riga.
const REQUEST_DELAY_MS = 150

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Il finish va dedotto dalla stampa, non solo dal treatment della richiesta:
// esistono stampe solo-foil (Pramikon, Sky Rampart in c19; le showcase
// giapponesi di Duskmourn) dove prices.eur è null per costruzione e il prezzo
// vive in prices.eur_foil. Leggendo solo .eur si otteneva null su quelle
// carte — e lo stesso effectiveFoil serve a CardTrader, che altrimenti filtra
// mtg_foil=false su una carta che in non-foil non è mai esistita.
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

// Il codice esatto è il caso comune (stampa della serie base): provandolo per
// primo si evita di scaricare gli export delle espansioni sorelle.
function orderExactFirst(expansions, setCode) {
  return [...expansions]
    .sort((a, b) => Number(b.code === setCode) - Number(a.code === setCode))
    .map(expansion => expansion.id)
}

// Un set Scryfall non mappa 1:1 su un'espansione CardTrader: loro lo spezzano
// prefissando il codice — dsk (base), cdsk (Collectors), adsk (Art Series),
// pdsk (Promos), predsk (Prerelease). Le stampe boosterfun/showcase, che
// Scryfall tiene sotto lo stesso `dsk` con collector number alto, stanno
// quindi in `cdsk`: cercare solo nel codice esatto le mancava sempre.
async function resolveExpansionIds(setCode) {
  // `%dsk` copre sia il codice esatto sia le sorelle prefissate.
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

async function resolveBlueprintId(scryfallId, setCode) {
  const { data: cached } = await supabase
    .from('pauperwave_cardtrader_blueprints')
    .select('id')
    .eq('scryfall_id', scryfallId)
    .maybeSingle()

  if (cached) return cached.id

  const expansionIds = await resolveExpansionIds(setCode.toLowerCase())

  for (const expansionId of expansionIds) {
    const response = await fetch(`${CARDTRADER_API_BASE}/blueprints/export?expansion_id=${expansionId}`, {
      headers: { Authorization: `Bearer ${CARDTRADER_API_TOKEN}` }
    })
    if (!response.ok) throw new Error(`CardTrader blueprints request failed: ${response.status}`)

    const blueprints = await response.json()
    const match = blueprints.find(blueprint => blueprint.scryfall_id === scryfallId)
    if (!match) continue

    await supabase.from('pauperwave_cardtrader_blueprints').upsert({
      id: match.id, scryfall_id: scryfallId, expansion_id: match.expansion_id, name: match.name
    })

    return match.id
  }

  return null
}

// La lingua si filtra qui e non più via query param (`language=en` hardcoded):
// quel default rendeva i due prezzi non confrontabili, perché Scryfall/
// CardMarket quota il prodotto in qualsiasi lingua mentre noi chiedevamo solo
// le copie inglesi. Su una stampa japanshowcase (es. Enduring Vitality
// dsk/394) la differenza era 4× — inglese scarso, non un errore di lookup.
// `language` null = "Indifferente": nessun filtro, minimo globale.
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
  // --all: include anche found/abandoned — per un run occasionale una tantum
  // (es. dopo il backfill di scryfall_id/set_code su richieste vecchie), non
  // per il cron settimanale, che resta mirato solo alle ricerche attive.
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
    // Fallback al treatment se Scryfall non risponde: meglio del nulla, ed è
    // il comportamento che il job aveva prima di conoscere i finish.
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
