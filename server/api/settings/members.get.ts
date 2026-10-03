// server\api\settings\members.get.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { Member } from '#shared/types/settings'

// A BFF read instead of the usual direct client query (ADR-007): user_roles RLS only lets a caller
// read their own row (or every row for super_admin), so an admin couldn't see other members' roles.
// requireAdminPermission matches 'manage-roles'/'access-settings'; who may grant what is enforced
// by assign_role.
export default defineEventHandler(async (event): Promise<Member[]> => {
  await requireAdminPermission(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  // Only organizer/admin/super_admin show up: 'player' is never stored (assign_role deletes the
  // row), so a row existing already means "current staff"
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
