// server\utils\auditColumns.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { JwtPayload } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Generic created_by/updated_by population, meant to be reused as-is by any
// table that follows the same convention (currently pauperwave_wanted_cards,
// eventually pauperwave_associates/associate_renewals/payments — see
// docs/BACKLOG.md). Resolves the acting user's pauperwave_associates.uuid via
// email match (same resolution used client-side for "My requests") so
// created_by/updated_by can reference associates directly — displaying "who"
// in the UI is then a plain join, never an admin-API call to resolve an auth
// user id to a name.
export async function resolveAuditAssociateUuid(
  event: H3Event,
  user: JwtPayload
): Promise<string | null> {
  if (!user.email) return null

  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data } = await supabase
    .from('pauperwave_associates')
    .select('uuid')
    .eq('email_address', user.email)
    .maybeSingle()

  return data?.uuid ?? null
}

export async function auditColumnsForInsert(event: H3Event, user: JwtPayload) {
  const associateUuid = await resolveAuditAssociateUuid(event, user)
  return { created_by: associateUuid, updated_by: associateUuid }
}

// updated_at is also set by a DB trigger (set_updated_at, see migration
// 20260808063237) as a safety net for writes outside the BFF — setting it
// here too is redundant but harmless, and keeps this helper self-sufficient
// for tables that don't have that trigger yet.
export async function auditColumnsForUpdate(event: H3Event, user: JwtPayload) {
  const associateUuid = await resolveAuditAssociateUuid(event, user)
  return { updated_by: associateUuid, updated_at: new Date().toISOString() }
}
