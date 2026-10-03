// app\composables\associates\useAssociatesTableSetup.ts
import type { Table } from '@tanstack/vue-table'
import type { Associate } from '~/types'

// Shared by associates/index.vue and associates/requests.vue: the same route/router (for the
// status-filter query param), table template-ref and useAssociatesRowActions() destructure, before
// each adds its own page-specific state
export function useAssociatesTableSetup() {
  const route = useRoute()
  const router = useRouter()

  const table = useTemplateRef<{ tableApi: Table<Associate> }>('table')
  const rowActions = useAssociatesRowActions()

  return { route, router, table, ...rowActions }
}
