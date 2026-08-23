// server\utils\idRequest.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Shared request-parsing prologue for /[id]/update.post.ts endpoints
// (fallow:dupes flagged this as an identical clone across associates/
// locations/mtg-formats/tournaments/wanted-cards) — auth check, numeric
// route id, typed body, and a service-role client, in the order every one
// of these handlers needs them.
export async function parseIdMutationRequest<T>(event: H3Event) {
  const user = await requireManagementPermission(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<T>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  return { user, id, body, supabase }
}

// Same prologue, without a body — shared by /[id]/delete.post.ts endpoints.
export async function parseIdRequest(event: H3Event) {
  const user = await requireManagementPermission(event)
  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)

  return { user, id, supabase }
}

// Every table that supports soft delete today — shared by softDeleteById and
// restoreById below, and by server/api/trash/restore.post.ts's whitelist
// check (app/types/index.d.ts's TrashEntity is the client-side mirror of
// this same set, mapped 1:1 in app/utils/trash/trashEntities.ts).
export type SoftDeletableTable
  = | 'mtg_formats' | 'tournaments' | 'leagues' | 'events'
    | 'pauperwave_payments' | 'pauperwave_wanted_cards' | 'locations'

// Shared body for /[id]/delete.post.ts endpoints that soft-delete (2026-08-16
// fallow:dupes flagged mtg-formats/tournaments/wanted-cards' delete handlers
// as identical once parseIdRequest already covered the prologue — every one
// of these now differs only by table name) — see the deleted_at convention
// note in each domain's own useQuery.ts. Also stamps deleted_by (2026-08-23,
// migration 20260823110000) via the same resolveAuditAssociateUuid helper
// created_by/updated_by already use — a dedicated column, not a reused
// updated_by, so restoring a row later doesn't leave a stale "deleted by"
// value sitting in what's supposed to be the edit-history column.
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

// Mirror of softDeleteById (clears deleted_at/deleted_by instead of setting
// them) — the Trash page's restore action, server/api/trash/restore.post.ts.
// No "restored_by" column: out of scope, only who deleted is tracked.
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

// Hard delete, restricted to rows already soft-deleted (guards against a
// stray call purging a live row) — the "permanently delete" tier above
// restoreById, server/api/trash/purge.post.ts. Also used by
// scripts/purge-expired-trash.mjs's own 60-day retention job, which
// duplicates this WHERE shape directly since Nitro auto-imports don't
// resolve from a standalone Node script (same reason as every other
// scripts/*.mjs, see refresh-wanted-cards-prices.mjs's file header).
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

// Shared by /[id]/status.post.ts endpoints (fallow:dupes, 2026-08-17
// flagged tournaments'/leagues' own status.post.ts as a byte-identical
// 17-line clone) — same table-name-as-parameter shape as softDeleteById,
// for the "update one column, 500 on failure, return the row" pattern
// the bulk "mark as" action needs instead of the full *update.post.ts
// payload shape.
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
