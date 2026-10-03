// app\composables\useModalOpenFromQuery.ts

// The "?action=create" convention: a sidebar/link opens a list page straight into its Add modal
// (e.g. /events?action=create) instead of requiring an extra click. Shared by the
// associates/events/leagues index pages
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
