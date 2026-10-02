// server\api\trash\restore.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { SoftDeletableTable } from '~~/server/utils/idRequest'

interface RestoreBody {
  table: SoftDeletableTable
  id: number
}

const RESTORABLE_TABLES: SoftDeletableTable[] = [
  'mtg_formats', 'tournaments', 'leagues', 'events',
  'pauperwave_payments', 'pauperwave_wanted_cards', 'locations'
]

// Admin-only (requireAdminPermission) — stricter than the organizer+ gate on
// the softDeleteById endpoints it mirrors, since restoring is a new
// capability being introduced here, not a loosening of the existing delete
// gate (see the open question in docs/architecture/permissions.md's "Note"
// section, resolved this way for restore specifically).
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event)
  const { table, id } = await readBody<RestoreBody>(event)

  if (!RESTORABLE_TABLES.includes(table)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid table' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  await restoreById(supabase, table, id)

  // A restored tournament counts again towards its league's/event's derived dates (derivedDates.ts).
  if (table === 'tournaments') {
    const { data: restored } = await supabase
      .from('tournaments')
      .select('league_uuid, event_uuid')
      .eq('id', id)
      .single()
    await recomputeLeagueDates(supabase, restored?.league_uuid ?? null)
    await recomputeEventDates(supabase, restored?.event_uuid ?? null)
  }

  return { restored: true }
})
