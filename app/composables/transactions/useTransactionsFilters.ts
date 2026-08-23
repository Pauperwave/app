// app\composables\transactions\useTransactionsFilters.ts
// Same date-range + type filter shape as useTournamentsFilters.ts.
import type { Ref } from 'vue'
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'
import type { Range, Transaction } from '~/types'

// typeFilter is passed in, not created here: the page keeps it synced with
// ?type= in the URL (same convention associates/index.vue uses for its own
// status tab), so the composable doesn't own that piece of state.
export function useTransactionsFilters(
  data: Ref<Transaction[]>,
  range: Ref<Range>,
  typeFilter: Ref<'all' | PaymentType>
) {
  const { t } = useI18n()

  // Single source of truth for filtering, shared by both UTable :data and any
  // future summary cards — same reasoning as useWantedCardsFilters.ts.
  const filteredTransactions = computed(() => data.value.filter((transaction) => {
    if (typeFilter.value !== 'all' && transaction.payment_type !== typeFilter.value) return false
    const date = new Date(transaction.payment_date)
    if (date < range.value.start || date > range.value.end) return false
    return true
  }))

  // Counts from the full unfiltered `data`, same convention as
  // useWantedCardsFilters.ts's statusTabs.
  const typeCounts = computed(() => {
    const counts = Object.fromEntries(
      PAYMENT_TYPES.map(type => [type, 0])
    ) as Record<PaymentType, number>
    for (const transaction of data.value) {
      if (transaction.payment_type in counts) counts[transaction.payment_type]++
    }
    return counts
  })

  const typeTabs = computed<{ label: string, value: 'all' | PaymentType, count?: number }[]>(() => [
    { label: t('transaction.tabs.all'), value: 'all', count: undefined },
    { label: t('transaction.tabs.associationFee'), value: 'Association Fee', count: typeCounts.value['Association Fee'] },
    { label: t('transaction.tabs.tournamentFee'), value: 'Tournament Fee', count: typeCounts.value['Tournament Fee'] },
    { label: t('transaction.tabs.eventFee'), value: 'Event Fee', count: typeCounts.value['Event Fee'] },
    { label: t('transaction.tabs.donations'), value: 'Donation', count: typeCounts.value.Donation },
    { label: t('transaction.tabs.tokenPurchase'), value: 'Token Purchase', count: typeCounts.value['Token Purchase'] }
  ])

  return { filteredTransactions, typeTabs }
}
