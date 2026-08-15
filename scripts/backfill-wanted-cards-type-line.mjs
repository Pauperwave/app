// scripts\backfill-wanted-cards-type-line.mjs
// One-off backfill: fills type_line (migration 20260815090000) for every
// wanted card that has a scryfall_id but no type_line yet — every row
// created before this column existed. Needed by the new color/land filter
// tabs on /wanted-cards, which use type_line to tell a land apart from a
// colorless nonland card (color_identity alone can't, both are []).
//
// Usage:
//   node --env-file=.env scripts/backfill-wanted-cards-type-line.mjs

// fallow-ignore-file security-sink -- the fetch() call (fallow security, ssrf
// candidate) always hits a hardcoded api.scryfall.com host with a card id
// read from our own DB, not attacker-controllable; this is an offline admin
// script, not an HTTP-reachable endpoint
import { createSupabaseAdminClient, sleep } from './lib/supabaseAdminClient.mjs'

const supabase = createSupabaseAdminClient()

const SCRYFALL_USER_AGENT = 'PauperWave-app/1.0 (wanted-cards type_line backfill; contact: emanuelenardi.dev@gmail.com)'
// Scryfall asks for at most 10 requests/sec and a "polite" delay between
// calls: https://scryfall.com/docs/api#rate-limits-and-good-citizenship.
const REQUEST_DELAY_MS = 150

async function fetchTypeLine(scryfallId) {
  const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
    headers: { 'User-Agent': SCRYFALL_USER_AGENT, 'Accept': 'application/json' }
  })
  if (!response.ok) throw new Error(`Scryfall request failed: ${response.status} ${response.statusText}`)

  const card = await response.json()
  return card.type_line ?? null
}

async function main() {
  const { data: rows, error } = await supabase
    .from('pauperwave_wanted_cards')
    .select('id, card_name, scryfall_id')
    .not('scryfall_id', 'is', null)
    .is('type_line', null)

  if (error) throw error

  console.log(`${rows.length} wanted card(s) missing type_line.`)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    let typeLine = null
    try {
      typeLine = await fetchTypeLine(row.scryfall_id)
    } catch (err) {
      console.error(`Scryfall lookup failed for #${row.id} "${row.card_name}":`, err.message)
    }
    await sleep(REQUEST_DELAY_MS)

    if (!typeLine) {
      skipped++
      continue
    }

    const { error: updateError } = await supabase
      .from('pauperwave_wanted_cards')
      .update({ type_line: typeLine })
      .eq('id', row.id)

    if (updateError) {
      console.error(`DB update failed for #${row.id} "${row.card_name}":`, updateError.message)
      skipped++
      continue
    }

    updated++
    console.log(`#${row.id} "${row.card_name}" -> ${typeLine}`)
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
