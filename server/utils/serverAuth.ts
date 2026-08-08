// server\utils\serverAuth.ts
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type { Database } from '#shared/utils/types/database'

export async function requireUser(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autenticato' })
  return user
}

// The BFF endpoint is the authorization boundary — the service-role client
// bypasses RLS, so management-only writes must check
// has_management_permissions explicitly here instead of relying on a policy.
export async function requireManagementPermission(event: H3Event) {
  const user = await requireUser(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: allowed, error } = await supabase.rpc('has_management_permissions', {
    // serverSupabaseUser() resolves the JWT payload, not the full Supabase
    // User — the user id is the standard JWT `sub` claim, not `.id`.
    p_user_id: user.sub
  })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!allowed) throw createError({ statusCode: 403, statusMessage: 'Permessi di gestione richiesti' })

  return user
}
