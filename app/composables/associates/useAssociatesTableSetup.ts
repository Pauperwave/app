// app\composables\associates\useAssociatesTableSetup.ts
import type { Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'

// Shared by associates/index.vue and associates/requests.vue — both wire up
// the same route/router (for the status-filter query param), table
// template-ref, and useAssociatesRowActions() destructure before adding
// their own page-specific state (roster filtering, bulk approve/reject, ...).
export function useAssociatesTableSetup() {
  const route = useRoute()
  const router = useRouter()

  const table = useTemplateRef<{ tableApi: Table<Associate> }>('table')
  const rowActions = useAssociatesRowActions()

  return { route, router, table, ...rowActions }
}
