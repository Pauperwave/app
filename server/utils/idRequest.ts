// server\utils\idRequest.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
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

// Shared body for /[id]/delete.post.ts endpoints that soft-delete (2026-08-16
// fallow:dupes flagged mtg-formats/tournaments/wanted-cards' delete handlers
// as identical once parseIdRequest already covered the prologue — every one
// of these now differs only by table name) — see the deleted_at convention
// note in each domain's own useQuery.ts.
export async function softDeleteById(
  supabase: SupabaseClient<Database>,
  table: 'mtg_formats' | 'tournaments' | 'leagues' | 'pauperwave_payments' | 'pauperwave_wanted_cards',
  id: number
) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
}
