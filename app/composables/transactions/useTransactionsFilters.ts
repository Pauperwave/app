// app\composables\transactions\useTransactionsFilters.ts
// Same date-range + type filter shape as useTournamentsFilters.ts.
import type { Ref } from 'vue'
import { PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentType } from '#shared/types/transactions'
import type { Range, Transaction } from '~/types'

// 'errors' is a synthetic pseudo-type, not a real payment_type value — a
// cross-cutting "needs manual attention" filter (see needsAttention,
// transactionIssues.ts) rather than one more slice of payment_type.
export type TransactionTypeFilter = 'all' | PaymentType | 'errors'

// typeFilter is passed in, not created here: the page keeps it synced with
// ?type= in the URL (same convention associates/index.vue uses for its own
// status tab), so the composable doesn't own that piece of state.
export function useTransactionsFilters(
  data: Ref<Transaction[]>,
  range: Ref<Range>,
  typeFilter: Ref<TransactionTypeFilter>
) {
  const { t } = useI18n()

  // Single source of truth for filtering, shared by both UTable :data and any
  // future summary cards — same reasoning as useWantedCardsFilters.ts.
  const filteredTransactions = computed(() => data.value.filter((transaction) => {
    // Bypasses the date range on purpose: these are rare, real data problems
    // that need fixing regardless of which period happens to be selected —
    // filtering them out because they fall outside the current range would
    // defeat the point of a "needs attention" tab.
    if (typeFilter.value === 'errors') return needsAttention(transaction)
    if (typeFilter.value !== 'all' && transaction.payment_type !== typeFilter.value) return false
    const date = new Date(transaction.payment_date)
    if (date < range.value.start || date > range.value.end) return false
    return true
  }))

  const errorsCount = computed(() => data.value.filter(needsAttention).length)

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

  // Icons reused from PAYMENT_TYPE_BADGE_CONFIG (single source of truth for
  // "which icon represents which payment type", also used by PaymentTypeBadge
  // and the payment_type table column) — collapse to icon-only below `lg` via
  // StatusFilterGroup's own icon prop (user request, 2026-08-24).
  const typeTabs = computed<
    { label: string, value: TransactionTypeFilter, count?: number, icon?: string }[]
  >(() => [
    { label: t('transaction.tabs.all'), value: 'all', count: undefined },
    {
      label: t('transaction.tabs.associationFee'),
      value: 'Association Fee',
      count: typeCounts.value['Association Fee'],
      icon: PAYMENT_TYPE_BADGE_CONFIG['Association Fee'].icon
    },
    {
      label: t('transaction.tabs.tournamentFee'),
      value: 'Tournament Fee',
      count: typeCounts.value['Tournament Fee'],
      icon: PAYMENT_TYPE_BADGE_CONFIG['Tournament Fee'].icon
    },
    {
      label: t('transaction.tabs.eventFee'),
      value: 'Event Fee',
      count: typeCounts.value['Event Fee'],
      icon: PAYMENT_TYPE_BADGE_CONFIG['Event Fee'].icon
    },
    {
      label: t('transaction.tabs.donations'),
      value: 'Donation',
      count: typeCounts.value.Donation,
      icon: PAYMENT_TYPE_BADGE_CONFIG.Donation.icon
    },
    {
      label: t('transaction.tabs.tokenPurchase'),
      value: 'Token Purchase',
      count: typeCounts.value['Token Purchase'],
      icon: PAYMENT_TYPE_BADGE_CONFIG['Token Purchase'].icon
    },
    {
      label: t('transaction.tabs.errors'),
      value: 'errors',
      count: errorsCount.value,
      icon: ICONS.warning
    }
  ])

  return { filteredTransactions, typeTabs }
}
