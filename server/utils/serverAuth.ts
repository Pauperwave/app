// server\utils\serverAuth.ts
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type { JwtPayload } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export async function requireUser(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non autenticato'
    })
  }

  return user
}

// Boolean variant of the has_management_permissions check, shared by requireManagementPermission
// and wantedCards.ts's requireManagementOrWantedCardOwner (which tries it first without throwing)
export async function hasManagementPermission(event: H3Event, user: JwtPayload): Promise<boolean> {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: allowed, error } = await supabase.rpc('has_management_permissions', {
    // serverSupabaseUser() resolves the JWT payload, not the full User: the id is the standard
    // `sub` claim, not `.id`
    p_user_id: user.sub
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return allowed
}

// The BFF endpoint is the authorization boundary: the service-role client bypasses RLS, so
// management-only writes must check has_management_permissions here
export async function requireManagementPermission(event: H3Event) {
  const user = await requireUser(event)

  if (!await hasManagementPermission(event, user)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Permessi di gestione richiesti'
    })
  }

  return user
}

// Stricter than requireManagementPermission: admin or above, via the is_admin_or_above RPC, for
// financial/bylaw-level writes where 'manage-membership-fees' is admin-only
// (app/utils/permissions.ts)
export async function requireAdminPermission(event: H3Event) {
  const user = await requireUser(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: allowed, error } = await supabase.rpc('is_admin_or_above', {
    p_user_id: user.sub
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Permessi di amministrazione richiesti'
    })
  }

  return user
}

// Stricter still: super_admin only, via the is_super_admin RPC, for the "permanently delete" tier
// (docs/architecture/permissions.md "Eliminare definitivamente"), above requireAdminPermission's
// restore
export async function requireSuperAdminPermission(event: H3Event) {
  const user = await requireUser(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: allowed, error } = await supabase.rpc('is_super_admin', {
    p_user_id: user.sub
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Permessi di super amministrazione richiesti'
    })
  }

  return user
}
