// app\composables\useCurrentAssociate.ts
// Resolves the Associate matching the logged-in user by email — there is no direct
// auth-user -> associate link (unlike Players, which have players.user_id); it is
// the same comparison used in server/api/check-associate.post.ts for the login
// itself. Shared between useWantedCardsFilters.ts ("My requests") and AddModal.vue
// (prefilling "Player" with the logged-in user).
export function useCurrentAssociate() {
  const authUser = useSupabaseUser()
  const { associates } = useAssociates()

  return computed(() =>
    associates.value.find(associate => associate.email_address === authUser.value?.email) ?? null)
}
