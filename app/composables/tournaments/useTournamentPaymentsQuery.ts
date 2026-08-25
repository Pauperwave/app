// app\composables\tournaments\useTournamentPaymentsQuery.ts
// Reads this tournament's active "Tournament Fee" pauperwave_payments rows —
// separate from useTournamentRegistrationsQuery.ts since payments key by
// associate_uuid, not player_uuid, and live in a different table entirely
// (server/api/tournament-registrations/payment.post.ts is what writes here).
import type { PaymentMethod } from '#shared/types/transactions'

export interface TournamentPayment {
  associateUuid: string
  paymentMethod: PaymentMethod
}

export const TOURNAMENT_PAYMENTS_KEY = (tournamentUuid: string) =>
  ['tournament-payments', tournamentUuid]

export function useTournamentPaymentsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_PAYMENTS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentPayment[]> => {
      const { data, error } = await supabase
        .from('pauperwave_payments')
        .select('associate_uuid, payment_method')
        .eq('tournament_uuid', toValue(tournamentUuid))
        .eq('payment_type', 'Tournament Fee')
        .is('deleted_at', null)

      if (error) throw error

      return (data ?? [])
        .filter((row): row is typeof row & { associate_uuid: string } =>
          row.associate_uuid !== null)
        .map(row => ({
          associateUuid: row.associate_uuid,
          paymentMethod: row.payment_method as PaymentMethod
        }))
    }
  })
}
