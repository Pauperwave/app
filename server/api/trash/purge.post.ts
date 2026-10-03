// server\api\trash\purge.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { SoftDeletableTable } from '~~/server/utils/idRequest'

interface PurgeBody {
  table: SoftDeletableTable
  id: number
}

const PURGEABLE_TABLES: SoftDeletableTable[] = [
  'mtg_formats', 'tournaments', 'leagues', 'events',
  'pauperwave_payments', 'pauperwave_wanted_cards', 'locations'
]

// super_admin-only: one tier above restore, matching "Eliminare definitivamente" in
// docs/architecture/permissions.md. The manual counterpart of the scheduled purge_expired_trash().
export default defineEventHandler(async (event) => {
  await requireSuperAdminPermission(event)
  const { table, id } = await readBody<PurgeBody>(event)

  if (!PURGEABLE_TABLES.includes(table)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid table' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  await purgeById(supabase, table, id)

  return { purged: true }
})
