// server\api\settings\members.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { Member } from '#shared/types/settings'

// A BFF read, not the usual direct client query most of this app's other
// lists use (ADR-007) — user_roles' own RLS only lets a caller read their
// own row or, once already super_admin, every row (the admin_full_access
// policy, migration 20260817090000's is_super_admin check), so an admin
// managing roles couldn't otherwise see anyone else's. requireAdminPermission
// (admin or above) matches 'manage-roles'/'access-settings' in
// app/utils/permissions.ts — the real, finer-grained boundary (who can grant
// what to whom) is enforced by the assign_role RPC itself, not here.
export default defineEventHandler(async (event): Promise<Member[]> => {
  await requireAdminPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  // Only organizer/admin/super_admin show up here (2026-08-25 user request)
  // — 'player' is never actually stored: assign_role deletes the user_roles
  // row entirely when a member is set back to 'player' (migration
  // 20260817100000), so a row existing at all already means "current staff".
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role, role_locked')

  if (rolesError) {
    throw createError({ statusCode: 500, statusMessage: rolesError.message })
  }

  const { data: players, error: playersError } = await supabase
    .from('players_full')
    .select('user_id, associate_uuid, first_name, last_name')
    .not('user_id', 'is', null)

  if (playersError) {
    throw createError({ statusCode: 500, statusMessage: playersError.message })
  }

  const playerByUserId = new Map(
    players
      .filter((player): player is typeof player & { user_id: string } => !!player.user_id)
      .map(player => [player.user_id, player])
  )

  return roles
    .map((roleRow): Member | null => {
      const player = playerByUserId.get(roleRow.user_id)
      if (!player?.associate_uuid) return null
      return {
        userId: roleRow.user_id,
        associateUuid: player.associate_uuid,
        name: `${player.first_name} ${player.last_name}`,
        role: roleRow.role,
        roleLocked: roleRow.role_locked
      }
    })
    .filter((member): member is Member => member !== null)
})
