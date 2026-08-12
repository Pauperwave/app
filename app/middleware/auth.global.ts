// app\middleware\auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  // `useSupabaseSession` is set synchronously from the Supabase
  // `onAuthStateChange` event. `useSupabaseUser` additionally depends on an
  // async `getClaims()` call that can silently reject and leave the user
  // stuck at null even with a valid session, so session is the safer check.
  const session = useSupabaseSession()

  // Allow access to login and auth callback pages. /tesseramento and its
  // informativa-dati page back tesseramento.pauperwave.org (ADR-011,
  // docs/PROGRESS.md) — the only genuinely public, unauthenticated pages
  // besides the auth flow itself. The statute has no page of its own here
  // (2026-08-11): it links out to the association's own canonical copy on
  // the blog instead of a mirrored /tesseramento/statuto route. The
  // surveillance notice was dropped entirely the same day (2026-08-11): the
  // association moved premises and it's no longer known whether the new
  // location is under video surveillance, so the consent/page no longer
  // applies (see docs/TODO.md). /rankings/* (added 2026-08-13) back
  // cittadino/commander/premodern/pauper.pauperwave.org — deliberately a
  // different URL than the internal /standings/* dashboard routes of the
  // same data (see StandingsPublicFormatPage.vue/StandingsPublicCittadinoPage.vue),
  // so publishing them doesn't take the dashboard version away from staff.
  // Keep in sync with nuxt.config.ts's supabase.redirectOptions.exclude
  // (see CLAUDE.md).
  const publicPages = [
    '/login', '/auth/callback', '/logout',
    '/tesseramento', '/tesseramento/informativa-dati',
    '/rankings/cittadino', '/rankings/commander', '/rankings/premodern', '/rankings/pauper'
  ]

  // prevents logged-in users from seeing the login page again
  if (session.value && to.path === '/login') {
    return navigateTo('/')
  }

  // If the route is public, allow access
  if (publicPages.includes(to.path)) {
    return
  }

  // Redirect to login if not authenticated
  if (!session.value) {
    return navigateTo('/login')
  }
})
