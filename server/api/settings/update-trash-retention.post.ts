// server\api\settings\update-trash-retention.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { UpdateTrashRetentionPayload } from '#shared/types/settings'

// super_admin-only (requireSuperAdminPermission) — stricter than the
// membership fee's requireAdminPermission next to it, matching
// 'purge-trash' (app/utils/permissions.ts): this value controls when
// purge_expired_trash() (migration 20260823120000) deletes data for good,
// same tier as the manual purge button itself.
export default defineEventHandler(async (event) => {
  const user = await requireSuperAdminPermission(event)

  const body = await readBody<UpdateTrashRetentionPayload>(event)

  if (!Number.isInteger(body.trashRetentionDays) || body.trashRetentionDays <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Numero di giorni non valido' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const settings = await updatePauperwaveSettings(supabase, event, user, {
    trash_retention_days: body.trashRetentionDays
  })

  return { settings }
})
