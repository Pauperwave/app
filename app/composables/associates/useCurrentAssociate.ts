// app\composables\associates\useCurrentAssociate.ts
// Resolves the Associate matching the logged-in user by email: there is no direct auth-user ->
// associate link (unlike Players' players.user_id), the same comparison as
// server/api/check-associate.post.ts at login. Shared by useWantedCardsFilters.ts ("My requests")
// and AddModal.vue (prefilling "Player")
export function useCurrentAssociate() {
  const authUser = useSupabaseUser()
  const { data: associates } = useAssociatesQuery()

  return computed(() => (associates.value ?? [])
    .find(associate => associate.email_address === authUser.value?.email) ?? null)
}
