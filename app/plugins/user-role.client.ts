// app\plugins\user-role.client.ts
// docs/architecture/roles.md §4: a login/logout doesn't change useUserRole's
// query key, so nothing tells the cache the previously-fetched role is now
// stale for a different user. .client-only is deliberate, not an oversight —
// onAuthStateChange is a live browser-side event stream with no SSR
// equivalent; the initial SSR-time fetch is triggered by middleware calling
// useUserRole().refresh() directly (step 10), not by this plugin.
export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const queryCache = useQueryCache()

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
      // SIGNED_OUT: clear the stale role. SIGNED_IN: a different user may
      // have just logged into the same browser, forcing a fresh fetch.
      queryCache.invalidateQueries({ key: USER_ROLE_KEY })
    }
    // TOKEN_REFRESHED: no-op, a token refresh doesn't change the role.
    // USER_UPDATED: not handled — no flow today changes a logged-in user's
    // own role mid-session.
  })
})
