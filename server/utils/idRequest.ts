// server\utils\idRequest.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
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
