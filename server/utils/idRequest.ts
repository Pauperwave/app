// server\utils\idRequest.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Shared request-parsing prologue for /[id]/update.post.ts endpoints: auth check, numeric route id,
// typed body and a service-role client.
export async function parseIdMutationRequest<T>(event: H3Event) {
  const user = await requireManagementPermission(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<T>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  return { user, id, body, supabase }
}

// Same prologue without a body, for /[id]/delete.post.ts endpoints
export async function parseIdRequest(event: H3Event) {
  const user = await requireManagementPermission(event)
  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)

  return { user, id, supabase }
}

// Shared by self-register.post.ts/self-unregister.post.ts: same { tournamentUuid } body plus the
// caller's own associate uuid (never taken from the body), i.e. the whole self-service prologue
export async function parseSelfRegistrationRequest(event: H3Event) {
  const user = await requireUser(event)
  const { tournamentUuid } = await readBody<{ tournamentUuid: string }>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  const associateUuid = await requireOwnAssociateUuid(event, user)

  return { tournamentUuid, associateUuid, supabase }
}

// Every table supporting soft delete; shared by softDeleteById, restoreById and
// trash/restore.post.ts's whitelist (TrashEntity in app/types/index.d.ts mirrors it, see
// app/utils/trash/trashEntities.ts)
export type SoftDeletableTable
  = | 'mtg_formats' | 'tournaments' | 'leagues' | 'events'
    | 'pauperwave_payments' | 'pauperwave_wanted_cards' | 'locations'

// Shared body for soft-deleting /[id]/delete.post.ts endpoints (differing only by table name; see
// each domain's useQuery.ts for the deleted_at filter). Also stamps deleted_by via
// resolveAuditAssociateUuid, in its own column so restoring a row doesn't leave a stale "deleted
// by" in updated_by.
export async function softDeleteById(
  event: H3Event,
  user: JwtPayload,
  supabase: SupabaseClient<Database>,
  table: SoftDeletableTable,
  id: number
) {
  const deletedBy = await resolveAuditAssociateUuid(event, user)

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
}

// Mirror of softDeleteById (clears deleted_at/deleted_by): the Trash page's restore. No
// "restored_by": only who deleted is tracked
export async function restoreById(
  supabase: SupabaseClient<Database>,
  table: SoftDeletableTable,
  id: number
) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
}

// Hard delete, only for rows already soft-deleted (guards against purging a live row): the
// "permanently delete" tier above restoreById (trash/purge.post.ts)
export async function purgeById(
  supabase: SupabaseClient<Database>,
  table: SoftDeletableTable,
  id: number
) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .not('deleted_at', 'is', null)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
}

// Shared by /[id]/status.post.ts endpoints: same table-name-as-parameter shape as softDeleteById,
// for "update one column, 500 on failure, return the row" (the bulk "mark as" action)
export async function updateStatusById(
  supabase: SupabaseClient<Database>,
  table: 'tournaments' | 'leagues' | 'events',
  id: number,
  status: string
) {
  const { data, error } = await supabase
    .from(table)
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? `${table} status update failed`
    })
  }

  return data
}

// Shared by /events/[id]/image.post.ts and /tournaments/[id]/image.post.ts: same shape as
// updateStatusById, for the single-row "set image" quick action
export async function setImageById(
  supabase: SupabaseClient<Database>,
  table: 'tournaments' | 'events',
  id: number,
  image: { imageUrl: string | null, imageCardName: string | null, imageCardArtist: string | null },
  errorMessage: string
) {
  const { data, error } = await supabase
    .from(table)
    .update({
      image_url: image.imageUrl,
      image_card_name: image.imageCardName,
      image_card_artist: image.imageCardArtist
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? errorMessage
    })
  }

  return data
}

// Shared by /associates/[id]/update.post.ts and update-number.post.ts: same shape as
// updateStatusById but admin-gated (requireAdminPermission) and fixed to pauperwave_associates, the
// only table "Gestire l'anagrafica soci" governs
export async function updateAssociateById(
  event: H3Event,
  id: number,
  updates: Database['public']['Tables']['pauperwave_associates']['Update'],
  errorMessage: string
) {
  const user = await requireAdminPermission(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({ ...updates, ...await auditColumnsForUpdate(event, user) })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? errorMessage
    })
  }

  return data
}
