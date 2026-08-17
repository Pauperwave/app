// app\composables\useUserRole.ts
import type { AppRole } from '~/types'

export const USER_ROLE_KEY = ['user-role']
export const ROLE_PREVIEW_STATE_KEY = 'role-preview'

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
  const realRole = computed<AppRole | undefined>(() => query.status.value === 'success' ? query.data.value : undefined)

  // "View as" (2026-08-17, docs/architecture/roles.md §1): lets a
  // super_admin preview the app as a lower role, UI-only. useState, not a
  // plain ref — survives client-side navigation during a preview session
  // (the whole point), but resets on a hard reload/new tab rather than
  // persisting to storage, so a preview can never quietly outlive the
  // session it was started in. Never gates real data access: RLS/BFF checks
  // still run against the real, unmodified auth.uid() regardless of this
  // value — see setRolePreview's own warning.
  const previewRole = useState<AppRole | null>(ROLE_PREVIEW_STATE_KEY, () => null)

  // Re-checked on every read, not just at activation time: if a super_admin
  // gets demoted mid-session while a preview is active, the override stops
  // applying the moment realRole no longer outranks it, rather than staying
  // stuck showing a preview nobody should still be able to grant themselves.
  const role = computed<AppRole | undefined>(() => {
    const preview = previewRole.value
    if (preview && realRole.value && ROLE_LEVEL[preview] <= ROLE_LEVEL[realRole.value]) {
      return preview
    }
    return realRole.value
  })

  const isPreviewing = computed(() => !!previewRole.value && role.value !== realRole.value)

  // Hard-guarded here too, not just in the UI that calls it — never trust
  // the caller checked isSuperAdmin first. Passing null/undefined clears
  // the preview and is always allowed, from any role.
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
    // Real role, not effective — the "view as" control itself (and any exit
    // path) must stay usable while previewing as a lower role, or a
    // super_admin previewing as player could lock themselves out of
    // super_admin-gated pages (e.g. /settings/members) with no way back.
    realIsSuperAdmin: computed(() => realRole.value === 'super_admin'),
    can: (permission: Permission) => can(role.value, permission)
  }
}
