// app\middleware\authorization.global.ts
// docs/architecture/roles.md §3. Nuxt runs global middleware alphabetically ("auth." < "autho"), so
// auth.global.ts (session check) runs first without extra config: re-check that ordering before
// renaming either file
export default defineNuxtRouteMiddleware(async (to) => {
  const permission = to.meta.permission
  if (!permission) return

  // Self-sufficient: refresh() is awaited before can() is checked, so an unresolved or errored
  // fetch is never misread as a decided role (useUserRole's `role`/`can` are already gated on
  // status === 'success'), staying fail-closed
  const userRole = useUserRole()
  await userRole.refresh()

  if (!userRole.can(permission)) {
    return navigateTo('/403')
  }
})
