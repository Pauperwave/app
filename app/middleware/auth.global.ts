// app\middleware\auth.global.ts
/* eslint-disable @stylistic/indent-binary-ops */
export default defineNuxtRouteMiddleware((to) => {
  // `useSupabaseSession` is set synchronously from the Supabase
  // `onAuthStateChange` event. `useSupabaseUser` additionally depends on an
  // async `getClaims()` call that can silently reject and leave the user
  // stuck at null even with a valid session, so session is the safer check.
  const session = useSupabaseSession()

  // Exact-match public paths: the auth flow itself.
  const publicPages = [
    '/login', '/auth/callback', '/logout'
  ]

  // Prefix-matched public paths: /tesseramento and /rankings/* back their
  // own subdomains (ADR-011, docs/PROGRESS.md) — prefix, not exact, so a
  // trailing slash or future sub-route still counts as public. Keep in
  // sync with nuxt.config.ts's supabase.redirectOptions.exclude.
  const publicPrefixes = [
    '/tesseramento',
    '/rankings/cittadino',
    '/rankings/commander',
    '/rankings/premodern',
    '/rankings/pauper'
  ]

  // Set server-side by server/middleware/public-host.ts + plugins/publicHost.server.ts
  // from the request Host header, then serialized into the SSR payload — so
  // hydration reads it synchronously instead of re-deriving it from
  // window.location, which Vercel's host rewrite (see {@link ../../vercel.json})
  // never touches, but whose path it does (`to.path` stays "/" client-side
  // and won't match publicPrefixes below).
  const isPublicHost = useState<boolean>('isPublicHost').value ?? false

  // prevents logged-in users from seeing the login page again
  if (session.value && to.path === '/login') {
    return navigateTo('/')
  }

  const isPublic = isPublicHost
    || publicPages.includes(to.path)
    || publicPrefixes.some(prefix => to.path === prefix
                                  || to.path.startsWith(`${prefix}/`))

  if (isPublic) {
    return
  }

  // Redirect to login if not authenticated
  if (!session.value) {
    return navigateTo('/login')
  }
})
