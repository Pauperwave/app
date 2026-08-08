// scripts\backfill-wanted-cards-scryfall.mjs
// One-off batch job: le wanted-cards create prima della migrazione
// 20260808120000 hanno solo scryfall_url, non scryfall_id/set_code (servono
// al resolver CardTrader, vedi server/utils/cardTrader.ts e la feasibility
// study 2026-08-08 in docs/PROGRESS.md). scryfall_url è nel formato
// scryfall.com/card/{set}/{collector_number}[/{lang}]/{slug} — se ne
// ricavano set+number (+lang quando presente, per le stampe in lingua non
// inglese migrate dal mock iniziale) e si richiama Scryfall per l'id esatto.
//
// Re-eseguibile: aggiorna solo le righe con scryfall_id ancora null.
//
// Usage:
//   node --env-file=.env scripts/backfill-wanted-cards-scryfall.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment (see .env).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Scryfall chiede max 10 richieste/sec e un delay "gentile" tra le chiamate:
// https://scryfall.com/docs/api#rate-limits-and-good-citizenship
const REQUEST_DELAY_MS = 100

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Segmenti dopo "/card/": [set, collectorNumber, lang?, slug] — lang è
// presente solo per le stampe non inglesi (es. "usg/321/it/culla-di-gea-...").
// Va isolato come segmento intero (non i primi 2 caratteri dello slug, che
// per pura coincidenza possono essere due lettere minuscole, es. "appa-...").
function parseScryfallUrl(url) {
  const path = new URL(url).pathname
  const segments = path.split('/').filter(Boolean)
  const cardIndex = segments.indexOf('card')
  if (cardIndex === -1 || segments.length < cardIndex + 3) return null

  const [set, collectorNumber, maybeLang] = segments.slice(cardIndex + 1)
  const lang = maybeLang && /^[a-z]{2}$/.test(maybeLang) ? maybeLang : null
  return { set, collectorNumber, lang }
}

const USER_AGENT = 'PauperWave-app/1.0 (wanted-cards scryfall_id backfill; contact: emanuelenardi.dev@gmail.com)'

async function fetchScryfallId({ set, collectorNumber, lang }) {
  const path = lang ? `${set}/${collectorNumber}/${lang}` : `${set}/${collectorNumber}`
  const response = await fetch(`https://api.scryfall.com/cards/${path}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Scryfall request failed: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`)
  }

  const card = await response.json()
  return { scryfallId: card.id, setCode: card.set }
}

async function main() {
  const { data: rows, error } = await supabase
    .from('pauperwave_wanted_cards')
    .select('id, card_name, scryfall_url')
    .is('scryfall_id', null)
    .not('scryfall_url', 'is', null)

  if (error) throw error

  console.log(`${rows.length} wanted card(s) to backfill.`)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const parsed = parseScryfallUrl(row.scryfall_url)
    if (!parsed) {
      console.warn(`Skipping #${row.id} "${row.card_name}": unparseable scryfall_url "${row.scryfall_url}".`)
      skipped++
      continue
    }

    try {
      const { scryfallId, setCode } = await fetchScryfallId(parsed)

      const { error: updateError } = await supabase
        .from('pauperwave_wanted_cards')
        .update({ scryfall_id: scryfallId, set_code: setCode })
        .eq('id', row.id)

      if (updateError) throw updateError

      updated++
      console.log(`#${row.id} "${row.card_name}" -> scryfall_id=${scryfallId} set_code=${setCode}`)
    } catch (err) {
      console.error(`Error backfilling #${row.id} "${row.card_name}":`, err.message)
      skipped++
    }

    await sleep(REQUEST_DELAY_MS)
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
