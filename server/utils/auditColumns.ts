// server\utils\auditColumns.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { JwtPayload } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

// Generic created_by/updated_by population for any table following the convention (wanted_cards,
// associates, payments; associate_renewals pending, see docs/BACKLOG.md). Resolves the acting
// user's pauperwave_associates.uuid by email (as client-side "My requests" does), so showing "who"
// is a plain join, never an admin-API call.
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

// Shared by self-register.post.ts/self-unregister.post.ts: the caller's own associate uuid (never
// from the body) and a consistent 403 when not linked
export async function requireOwnAssociateUuid(event: H3Event, user: JwtPayload): Promise<string> {
  const associateUuid = await resolveAuditAssociateUuid(event, user)
  if (!associateUuid) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Nessun socio associato a questo account'
    })
  }
  return associateUuid
}

export async function auditColumnsForInsert(event: H3Event, user: JwtPayload) {
  const associateUuid = await resolveAuditAssociateUuid(event, user)
  return { created_by: associateUuid, updated_by: associateUuid }
}

// updated_at is also set by the set_updated_at DB trigger as a safety net for writes outside the
// BFF; setting it here is redundant but keeps the helper self-sufficient for tables without the
// trigger
export async function auditColumnsForUpdate(event: H3Event, user: JwtPayload) {
  const associateUuid = await resolveAuditAssociateUuid(event, user)
  return { updated_by: associateUuid, updated_at: new Date().toISOString() }
}
