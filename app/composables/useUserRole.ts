// app\composables\useUserRole.ts
import type { AppRole } from '~/types'

export const USER_ROLE_KEY = ['user-role']
export const ROLE_PREVIEW_STATE_KEY = 'role-preview'

// Mirrors useWantedCardsQuery.ts's shape (docs/architecture/roles.md §1): a plain composable
// calling useQuery, no Pinia store. The role query is excluded from localStorage persistence in
// colada.options.ts. The user id is decoded from the JWT's `sub` claim because useSupabaseUser()
// gets stuck null here (its async getClaims() has no .catch(), see auth.global.ts and
// auth/callback.vue); useSupabaseSession() is populated synchronously from onAuthStateChange.
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

  // An unresolved role (status !== 'success') is never treated as decided: undefined, not the
  // stale/default value, guarding isStaff/isAdmin/etc. like can() below (query.data can hold a
  // stale value while status is 'error')
  const realRole = computed<AppRole | undefined>(() => query.status.value === 'success' ? query.data.value : undefined)

  // "View as" (docs/architecture/roles.md §1): lets a super_admin preview the app as a lower role,
  // UI-only. useState, not a ref: it survives client-side navigation but resets on a hard
  // reload/new tab, so a preview never outlives its session. Never gates real data access: RLS/BFF
  // checks use the real auth.uid() (see setRolePreview)
  const previewRole = useState<AppRole | null>(ROLE_PREVIEW_STATE_KEY, () => null)

  // Re-checked on every read: if a super_admin is demoted mid-preview, the override stops applying
  // once realRole no longer outranks it
  const role = computed<AppRole | undefined>(() => {
    const preview = previewRole.value
    if (preview && realRole.value && ROLE_LEVEL[preview] <= ROLE_LEVEL[realRole.value]) {
      return preview
    }
    return realRole.value
  })

  const isPreviewing = computed(() => !!previewRole.value && role.value !== realRole.value)

  // Hard-guarded here too, not just in the calling UI. Passing null/undefined clears the preview
  // and is always allowed
  function setRolePreview(target: AppRole | null) {
    if (target && realRole.value !== 'super_admin') return
    previewRole.value = target
  }

  const isOrganizer = computed(() => role.value === 'organizer')
  const isAdmin = computed(() => role.value === 'admin')
  const isSuperAdmin = computed(() => role.value === 'super_admin')
  const isStaff = computed(() => role.value !== undefined && role.value !== 'player')

  return {
    ...query,
    role,
    realRole,
    isPreviewing,
    setRolePreview,
    isOrganizer,
    isAdmin,
    isSuperAdmin,
    isStaff,
    // Real role, not effective: the "view as" control (and any exit path) must stay usable while
    // previewing a lower role, or a super_admin previewing as player could lock themselves out of
    // super_admin-gated pages (e.g. /settings/members)
    realIsSuperAdmin: computed(() => realRole.value === 'super_admin'),
    can: (permission: Permission) => can(role.value, permission)
  }
}
