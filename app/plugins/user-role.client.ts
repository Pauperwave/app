// app\plugins\user-role.client.ts
// docs/architecture/roles.md §4: a login/logout doesn't change useUserRole's query key, so nothing
// marks the cached role stale for a different user. .client-only on purpose: onAuthStateChange has
// no SSR equivalent, and the initial SSR fetch comes from the middleware calling
// useUserRole().refresh()
export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const queryCache = useQueryCache()

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
      // SIGNED_OUT: clear the stale role. SIGNED_IN: a different user may have logged into the same
      // browser
      queryCache.invalidateQueries({ key: USER_ROLE_KEY })
    }
    // TOKEN_REFRESHED: no-op (the role doesn't change). USER_UPDATED: not handled, no flow changes
    // a user's own role mid-session
  })
})
