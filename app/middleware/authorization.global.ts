// app\middleware\authorization.global.ts
// docs/architecture/roles.md §3. Nuxt runs global middleware in filename
// alphabetical order ("auth." < "autho" — the "." sorts before "o"), so
// auth.global.ts (session check) always runs first without extra config —
// don't rename either file without re-checking that ordering still holds.
export default defineNuxtRouteMiddleware(async (to) => {
  const permission = to.meta.permission
  if (!permission) return

  // Self-sufficient: never assumes the role was already resolved
  // elsewhere. refresh() awaited before can() is checked, so an unresolved
  // or errored fetch can never be misread as a decided role — useUserRole's
  // own `role`/`can` are already gated on status === 'success' (see its
  // implementation), so this stays fail-closed without duplicating that check.
  const userRole = useUserRole()
  await userRole.refresh()

  if (!userRole.can(permission)) {
    return navigateTo('/403')
  }
})
