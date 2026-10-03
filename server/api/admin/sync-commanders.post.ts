// server\api\admin\sync-commanders.post.ts
// Incremental resync: fetches commander-eligible cards from Scryfall (paper, English,
// legal:commander or not yet released, Backgrounds included), diffs against mtg_commanders and
// inserts ONLY the new rows. Never re-fetches or overwrites rows already synced, so manual
// corrections survive. Gated by requireManagementPermission. The rules and the database
// access are in server/utils/commanders/catalogSync.ts and catalogStore.ts.
//
// The common case is scoped with `date>=<latest past released_at, minus a lookback>`, so a routine
// resync only pages through cards released since the last sync instead of the whole ~3600-card
// set. released_at is NULL on pre-existing rows, so the first run does one full unscoped fetch that
// backfills it and detects new cards in the same pass.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const today = new Date().toISOString().slice(0, 10)
  const existing = summarizeCatalog(await fetchCatalogRows(supabase), today)
  const { needsFullFetch, startUrl } = planCatalogSync(existing)

  const { cards: fetchedCards, scanned } = await fetchCommanderCards(
    startUrl, existing, !needsFullFetch
  )

  if (needsFullFetch) {
    await backfillReleasedDates(supabase, existing.rowsNeedingReleasedAt, fetchedCards)
  }

  const added = await insertNewCards(supabase, selectNewCards(fetchedCards, existing))

  return { added: added.length, checked: scanned, cards: added }
})
