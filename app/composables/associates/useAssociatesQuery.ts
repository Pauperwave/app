// app\composables\associates\useAssociatesQuery.ts
// Pinia Colada query for the associates list (mirrors league's usePlayersQuery,
// ADR-007/ADR-009) — successor of the 'associates' useAsyncData wrapper. Reads stay
// client -> Supabase; the shared query cache is what fixes the /associates <->
// /associates/requests refetch-on-every-mount lag useAsyncData had (confirmed via
// network trace 2026-08-11).
import type { Associate } from '~/types'

export const ASSOCIATES_KEY = ['associates']

export function useAssociatesQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: ASSOCIATES_KEY,
    query: async (): Promise<Associate[]> => {
      const { data, error } = await supabase
        .from('pauperwave_associates_with_status')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error

      // membership_request_status/membership_status are free text in the DB (not
      // Postgres enums), but the app only handles the known values from the types
      return (data ?? []) as Associate[]
    }
  })
}
