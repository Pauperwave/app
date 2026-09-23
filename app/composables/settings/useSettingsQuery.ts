// app\composables\settings\useSettingsQuery.ts
import type { PaymentMethod } from '#shared/types/transactions'
import type { SwissRoundCountTier } from '#shared/types/settings'

export const SETTINGS_KEY = ['settings']

// pauperwave_settings is a singleton table (a single row, id pinned to 1) —
// association-wide bylaw values, currently just the membership fee (migration
// 20260819100000). Grows the same way pauperwave_wanted_cards' own columns did:
// one row selected/mapped here, not a generic key-value blob.
export interface AppSettings {
  membershipFeeAmount: number
  membershipFeePaymentMethod: PaymentMethod
  // Days a soft-deleted row survives on /trash before pg_cron's
  // purge_expired_trash() job removes it for good (migration
  // 20260823120000) — same singleton-row convention as the membership fee
  // fields above, not a separate table.
  trashRetentionDays: number
  // Tournament values that used to be hardcoded in the tournament logic
  // (migrations 20260920000000, 20260920030000); the Swiss tiers are jsonb.
  commanderRoundMinutes: number
  oneVsOneRoundMinutes: number
  commanderRoundCount: number
  oneVsOneRoundCount: number
  swissRoundCountTiers: SwissRoundCountTier[]
  swissRoundCountBeyond: number
  // "Pre" phase length (useRoundTimerEngine.ts's SISTEMATEVI countdown before
  // GIOCO starts) — was hardcoded PRE_TIMER_MINUTES = 3, parametrized
  // 2026-09-23 (migration 20260923120000) into its own "Timer" settings
  // section alongside the two round-duration fields above.
  preRoundWaitMinutes: number
}

export function useSettingsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: SETTINGS_KEY,
    query: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from('pauperwave_settings')
        .select(`
          membership_fee_amount, membership_fee_payment_method, trash_retention_days,
          commander_round_minutes, one_vs_one_round_minutes, commander_round_count,
          one_vs_one_round_count, swiss_round_count_tiers, swiss_round_count_beyond,
          pre_round_wait_minutes
        `)
        .eq('id', 1)
        .single()

      if (error) throw error

      return {
        membershipFeeAmount: data.membership_fee_amount,
        membershipFeePaymentMethod: data.membership_fee_payment_method as PaymentMethod,
        trashRetentionDays: data.trash_retention_days,
        commanderRoundMinutes: data.commander_round_minutes,
        oneVsOneRoundMinutes: data.one_vs_one_round_minutes,
        commanderRoundCount: data.commander_round_count,
        oneVsOneRoundCount: data.one_vs_one_round_count,
        swissRoundCountTiers: data.swiss_round_count_tiers as unknown as SwissRoundCountTier[],
        swissRoundCountBeyond: data.swiss_round_count_beyond,
        preRoundWaitMinutes: data.pre_round_wait_minutes
      }
    }
  })
}
