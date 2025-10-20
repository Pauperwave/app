// app/middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Allow access to login and auth callback pages
  const publicPages = ['/login', '/auth/callback']

  // prevents logged-in users from seeing the login page again
  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }

  // If the route is public, allow access
  if (publicPages.includes(to.path)) {
    return
  }

  // Redirect to login if not authenticated
  if (!user.value) {
    return navigateTo('/login')
  }
})
