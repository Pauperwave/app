// app\middleware\auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  // `useSupabaseSession` is set synchronously from the Supabase
  // `onAuthStateChange` event. `useSupabaseUser` additionally depends on an
  // async `getClaims()` call that can silently reject and leave the user
  // stuck at null even with a valid session, so session is the safer check.
  const session = useSupabaseSession()

  // Allow access to login and auth callback pages
  const publicPages = ['/login', '/auth/callback', '/logout']

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
