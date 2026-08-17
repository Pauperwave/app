// app\composables\useUserRole.ts
import type { AppRole } from '~/types'

export const USER_ROLE_KEY = ['user-role']

// Mirrors useWantedCardsQuery.ts's shape (docs/architecture/roles.md §1) — a
// plain composable calling useQuery directly, no Pinia store layer. The
// role query is excluded from localStorage persistence in
// colada.options.ts (step 6, must land before this composable exists).
// Confirmed by manual testing (2026-08-17) that useSupabaseUser() gets stuck
// permanently null/unresolved in this app — same flakiness auth.global.ts's
// and auth/callback.vue's own comments already warn about (an async
// getClaims() call with no .catch()). Decoding the user id straight out of
// the JWT's `sub` claim avoids that async dependency entirely; useSupabaseSession()
// is populated synchronously from onAuthStateChange, same as those two files rely on.
function userIdFromAccessToken(accessToken: string): string | undefined {
  try {
    const [, payload] = accessToken.split('.')
    if (!payload) return undefined
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)).sub
  } catch {
    return undefined
  }
}

export function useUserRole() {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  const userId = computed(() => session.value
    ? userIdFromAccessToken(session.value.access_token)
    : undefined)

  const query = useQuery({
    key: USER_ROLE_KEY,
    enabled: () => !!userId.value,
    query: async (): Promise<AppRole> => {
      const { data, error } = await supabase.rpc('get_user_role', { p_user_id: userId.value! })
      if (error) throw error
      return data
    }
  })

  // Unresolved role (status !== 'success') is never treated as decided —
  // undefined here, not the stale/default value, until the query actually
  // succeeds. Guards isStaff/isAdmin/etc. the same way can() below guards
  // itself, rather than trusting query.data.value directly (which can be
  // populated with a previous/stale value while status is 'error').
  const role = computed<AppRole | undefined>(() => query.status.value === 'success' ? query.data.value : undefined)

  const isOrganizer = computed(() => role.value === 'organizer')
  const isAdmin = computed(() => role.value === 'admin')
  const isSuperAdmin = computed(() => role.value === 'super_admin')
  const isStaff = computed(() => role.value !== undefined && role.value !== 'player')

  return {
    ...query,
    role,
    isOrganizer,
    isAdmin,
    isSuperAdmin,
    isStaff,
    can: (permission: Permission) => can(role.value, permission)
  }
}
