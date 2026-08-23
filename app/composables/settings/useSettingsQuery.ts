// app\composables\settings\useSettingsQuery.ts
import type { PaymentMethod } from '#shared/types/transactions'

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
}

export function useSettingsQuery() {
  const supabase = useSupabaseClient()

  return useQuery({
    key: SETTINGS_KEY,
    query: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from('pauperwave_settings')
        .select('membership_fee_amount, membership_fee_payment_method, trash_retention_days')
        .eq('id', 1)
        .single()

      if (error) throw error

      return {
        membershipFeeAmount: data.membership_fee_amount,
        membershipFeePaymentMethod: data.membership_fee_payment_method as PaymentMethod,
        trashRetentionDays: data.trash_retention_days
      }
    }
  })
}
