// app\composables\transactions\useTransactionsQuery.ts
// Pinia Colada query for the transactions domain (ADR-007/ADR-009 pattern, see
// useAssociatesQuery.ts) — reads stay client -> Supabase (RLS-gated by
// management_full_access/player_own_payments), writes go through the BFF
// (server/api/transactions/create.post.ts).
import type { Transaction } from '~/types'

export const TRANSACTIONS_KEY = ['transactions']

export function useTransactionsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: TRANSACTIONS_KEY,
    query: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('pauperwave_payments')
        // Explicit hint on the FK column: created_by/updated_by also reference
        // pauperwave_associates now (migration
        // 20260812150000_payments_audit_columns.sql), so PostgREST can no
        // longer work out on its own which of the three relations "associate"
        // means — same fix as useWantedCardsQuery.ts.
        .select(`
          *,
          associate:pauperwave_associates!associate_uuid(uuid, first_name, last_name, pauperwave_associate_number)
        `)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })

      if (error) throw error

      return (data ?? []) as Transaction[]
    }
  })
}
