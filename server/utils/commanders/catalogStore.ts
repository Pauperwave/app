// server\utils\commanders\catalogStore.ts
// The database side of the commander catalog sync (server/api/admin/sync-commanders.post.ts): read
// what mtg_commanders holds, backfill release dates, insert the new cards.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'
import { buildInsertRows, type ExistingCatalog, type ScryfallCard } from './catalogSync'

type Supabase = SupabaseClient<Database>

// Every row of mtg_commanders, a page at a time (the catalog is past PostgREST's row cap)
export async function fetchCatalogRows(supabase: Supabase) {
  const rows: { scryfall_id: string, card_name: string, released_at: string | null }[] = []
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('mtg_commanders')
      .select('scryfall_id, card_name, released_at')
      .range(rows.length, rows.length + pageSize - 1)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) return rows
  }
}

// Fills released_at for rows synced before it existed, matched by name against the fetch already in
// hand (not by scryfall_id: the stored printing may be excluded by `-is:digital`, so Scryfall picks
// a same-named one). No extra Scryfall requests.
export async function backfillReleasedDates(
  supabase: Supabase,
  rowsNeedingReleasedAt: ExistingCatalog['rowsNeedingReleasedAt'],
  allFetchedCards: ScryfallCard[]
): Promise<number> {
  if (rowsNeedingReleasedAt.length === 0) return 0

  const releasedAtByName = new Map(allFetchedCards.map(card => [card.name, card.released_at]))
  const rowsToUpdate = rowsNeedingReleasedAt
    .map(row => ({
      scryfall_id: row.scryfallId,
      card_name: row.cardName,
      released_at: releasedAtByName.get(row.cardName)
    }))
    .filter((row): row is { scryfall_id: string, card_name: string, released_at: string } =>
      !!row.released_at)

  const chunkSize = 500
  for (let i = 0; i < rowsToUpdate.length; i += chunkSize) {
    const chunk = rowsToUpdate.slice(i, i + chunkSize)
    const { error } = await supabase.from('mtg_commanders').upsert(chunk, { onConflict: 'scryfall_id' })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return rowsToUpdate.length
}

// Returns the names of the cards inserted
export async function insertNewCards(
  supabase: Supabase,
  newCards: ScryfallCard[]
): Promise<string[]> {
  if (newCards.length === 0) return []

  const { data: inserted, error } = await supabase
    .from('mtg_commanders')
    .insert(buildInsertRows(newCards))
    .select('card_name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return (inserted ?? []).map(row => row.card_name)
}
