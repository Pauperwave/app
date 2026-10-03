// app\composables\transactions\useTransactionsQuery.ts
// Pinia Colada query for the transactions domain (ADR-007/ADR-009, see useAssociatesQuery.ts):
// reads go client -> Supabase (RLS-gated by management_full_access/player_own_payments), writes
// through the BFF (server/api/transactions/create.post.ts)
import type { PaymentMethod, PaymentType } from '#shared/types/transactions'
import type { Transaction } from '~/types'

export const TRANSACTIONS_KEY = ['transactions']

export function useTransactionsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: TRANSACTIONS_KEY,
    query: async (): Promise<Transaction[]> => {
      const fetchPage = (from: number, to: number) => supabase
        .from('pauperwave_payments')
        // Explicit hint on each FK column: created_by/updated_by also reference
        // pauperwave_associates (migration 20260812150000), so PostgREST can't tell which of the
        // three relations "associate" means (as in useWantedCardsQuery.ts)
        .select(`
          *,
          associate:pauperwave_associates!associate_uuid(uuid, first_name, last_name, pauperwave_associate_number),
          created_by_associate:pauperwave_associates!created_by(first_name, last_name),
          updated_by_associate:pauperwave_associates!updated_by(first_name, last_name),
          tournament:tournaments(uuid, name, league_uuid),
          event:events(uuid, name)
        `)
        .is('deleted_at', null)
        // id (unique, unlike payment_date) is the requested default sort and the only column making
        // the pagination below stable: ties on the order column have no guaranteed order across
        // .range() requests and could skip or duplicate a row
        .order('id', { ascending: false })
        .range(from, to)

      const allRows = await fetchAllRows(fetchPage)

      return allRows.map((row): Transaction => {
        // created_by/updated_by dropped from `rest` on purpose: Transaction omits the raw
        // uuids in favour of the resolved createdBy/updatedBy names below.
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          created_by, updated_by, created_by_associate, updated_by_associate,
          tournament, event, ...rest
        } = row
        return {
          ...rest,
          payment_type: rest.payment_type as PaymentType,
          payment_method: rest.payment_method as PaymentMethod,
          createdBy: created_by_associate ? `${created_by_associate.first_name} ${created_by_associate.last_name}` : '',
          updatedBy: updated_by_associate ? `${updated_by_associate.first_name} ${updated_by_associate.last_name}` : '',
          tournament: tournament
            ? { uuid: tournament.uuid, name: tournament.name, leagueUuid: tournament.league_uuid }
            : null,
          event: event ? { uuid: event.uuid, name: event.name } : null
        }
      })
    }
  })
}
