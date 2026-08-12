// scripts\backfill-wanted-cards-scryfall.mjs
// One-off batch job: wanted cards created before migration 20260808120000 only have
// scryfall_url, not scryfall_id/set_code (which the CardTrader resolver needs, see
// server/utils/cardTrader.ts and the 2026-08-08 feasibility study in
// docs/PROGRESS.md). scryfall_url has the form
// scryfall.com/card/{set}/{collector_number}[/{lang}]/{slug} — set+number (+lang
// when present, for the non-English printings migrated from the initial mock) are
// extracted from it and Scryfall is called for the exact id.
//
// Re-runnable: it only updates rows whose scryfall_id is still null.
//
// Usage:
//   node --env-file=.env scripts/backfill-wanted-cards-scryfall.mjs

// fallow-ignore-file security-sink -- the fetch() call (fallow security, ssrf
// candidate) always hits a hardcoded api.scryfall.com host; only the path segment
// is built from card data, the host is never attacker-controllable, and this is an
// offline admin script anyway, not an HTTP-reachable endpoint
import { createSupabaseAdminClient, sleep } from './lib/supabaseAdminClient.mjs'

const supabase = createSupabaseAdminClient()

// Scryfall asks for at most 10 requests/sec and a "polite" delay between calls:
// https://scryfall.com/docs/api#rate-limits-and-good-citizenship
const REQUEST_DELAY_MS = 100

// Segments after "/card/": [set, collectorNumber, lang?, slug] — lang is only
// present for non-English printings (e.g. "usg/321/it/culla-di-gea-..."). It has to
// be isolated as a whole segment (not the first 2 characters of the slug, which by
// sheer coincidence can be two lowercase letters, e.g. "appa-...").
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
