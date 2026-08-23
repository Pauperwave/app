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

// super_admin-only (requireSuperAdminPermission) — one tier above restore's
// requireAdminPermission, matching the "Eliminare definitivamente" row in
// docs/architecture/permissions.md (user request, 2026-08-23: a manual purge
// button on /trash, alongside the 60-day auto-purge in
// scripts/purge-expired-trash.mjs).
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
