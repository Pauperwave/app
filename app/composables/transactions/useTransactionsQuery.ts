// app\composables\transactions\useTransactionsQuery.ts
// Pinia Colada query for the transactions domain (ADR-007/ADR-009 pattern, see
// useAssociatesQuery.ts) — reads stay client -> Supabase (RLS-gated by
// management_full_access/player_own_payments), writes go through the BFF
// (server/api/transactions/create.post.ts).
import type { PaymentMethod, PaymentType } from '#shared/types/transactions'
import type { Transaction } from '~/types'

export const TRANSACTIONS_KEY = ['transactions']

export function useTransactionsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: TRANSACTIONS_KEY,
    query: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('pauperwave_payments')
        // Explicit hint on each FK column: created_by/updated_by also reference
        // pauperwave_associates now (migration
        // 20260812150000_payments_audit_columns.sql), so PostgREST can no
        // longer work out on its own which of the three relations "associate"
        // means — same fix as useWantedCardsQuery.ts.
        .select(`
          *,
          associate:pauperwave_associates!associate_uuid(uuid, first_name, last_name, pauperwave_associate_number),
          created_by_associate:pauperwave_associates!created_by(first_name, last_name),
          updated_by_associate:pauperwave_associates!updated_by(first_name, last_name)
        `)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row): Transaction => {
        // created_by/updated_by dropped from `rest` on purpose: Transaction omits the raw
        // uuids in favour of the resolved createdBy/updatedBy names below.
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          created_by, updated_by, created_by_associate, updated_by_associate, ...rest
        } = row
        return {
          ...rest,
          payment_type: rest.payment_type as PaymentType,
          payment_method: rest.payment_method as PaymentMethod,
          createdBy: created_by_associate ? `${created_by_associate.first_name} ${created_by_associate.last_name}` : '',
          updatedBy: updated_by_associate ? `${updated_by_associate.first_name} ${updated_by_associate.last_name}` : ''
        }
      })
    }
  })
}
