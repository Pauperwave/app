// app\types\nuxt.d.ts
// docs/architecture/roles.md §2: augments Nuxt's PageMeta so
// definePageMeta({ permission: 'manage-members' }) type-checks against
// app/utils/permissions.ts's Permission union.
declare module '#app' {
  interface PageMeta {
    permission?: Permission
  }
}

export {}
