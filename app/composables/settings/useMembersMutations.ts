// app\composables\settings\useMembersMutations.ts
import type { MemberRole } from '#shared/types/settings'

// assign_role is called directly via the Supabase client, not through a BFF
// endpoint like every other write in this app (ADR-007's "never direct
// Supabase writes from client" convention) — it's SECURITY DEFINER and fully
// self-guards permission internally (is_admin_or_above, role_locked, the
// super_admin-only carve-out for granting/touching super_admin, migrations
// 20260817100000/20260823130000/20260823140000), same precedent as
// useUserRole.ts's own direct supabase.rpc('get_user_role', ...) call.
export function useMembersMutations() {
  const supabase = useSupabaseClient()
  const queryCache = useQueryCache()

  const assignRole = useMutation({
    mutation: async (payload: { userId: string, role: MemberRole }) => {
      const { error } = await supabase.rpc('assign_role', {
        p_user_id: payload.userId,
        p_role: payload.role
      })
      if (error) throw error
    },
    onSettled: () => queryCache.invalidateQueries({ key: MEMBERS_KEY })
  })

  return { assignRole }
}
