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
      // This project's PostgREST caps every request at 250 rows (db.max_rows)
      // regardless of an explicit .range() width — a plain unranged select
      // silently truncates to the newest 250 payments instead of erroring,
      // which hid every payment older than ~250 rows back once the 2026
      // historical import pushed the table past that (confirmed 2026-08-23).
      // Page through explicitly so the query always returns everything.
      const fetchPage = (from: number, to: number) => supabase
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
          updated_by_associate:pauperwave_associates!updated_by(first_name, last_name),
          tournament:tournaments(uuid, name, league_uuid),
          event:events(uuid)
        `)
        .is('deleted_at', null)
        // id (unique, unlike payment_date which has plenty of ties) is both
        // the requested default sort and, incidentally, the only column that
        // makes pagination below stable — ties on the order column have no
        // guaranteed order across separate .range() requests, which could
        // otherwise skip or duplicate a row at a page boundary.
        .order('id', { ascending: false })
        .range(from, to)

      const pageSize = 250
      let allRows: NonNullable<Awaited<ReturnType<typeof fetchPage>>['data']> = []
      let from = 0
      while (true) {
        const { data, error } = await fetchPage(from, from + pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < pageSize) break
        from += pageSize
      }

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
          event: event ? { uuid: event.uuid } : null
        }
      })
    }
  })
}
