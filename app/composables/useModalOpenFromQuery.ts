// app\composables\useModalOpenFromQuery.ts

// The "?action=create" convention: a sidebar/link can open a list page straight
// into its Add modal (e.g. /events?action=create) instead of landing on the list
// and requiring an extra click. Same three-line pattern was copy-pasted across
// associates/events/leagues' index pages — extracted here once a 3rd copy
// showed up unchanged.
export function useModalOpenFromQuery() {
  const route = useRoute()
  const router = useRouter()
  const isModalOpen = ref(false)

  onMounted(() => {
    if (route.query.action === 'create') {
      isModalOpen.value = true
      router.replace({ query: {} })
    }
  })

  return { isModalOpen }
}
