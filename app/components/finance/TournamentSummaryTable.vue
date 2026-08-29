<!-- app\components\finance\TournamentSummaryTable.vue -->
<script setup lang="ts">
import { UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { FinanceTournamentSummaryRow } from '~/composables/finance/useFinanceSummary'
import TournamentsStageLabel from '~/components/tournaments/StageLabel.vue'
import FormatBadge from '~/components/badges/FormatBadge.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

const { rows, loading, pending = false } = defineProps<{
  rows: FinanceTournamentSummaryRow[]
  loading: boolean
  pending?: boolean
}>()

const { t } = useI18n()

const amountFormatter = AMOUNT_FORMATTER

// Chronological, not by amount (user request, 2026-08-23) — 'startDate'
// column id, so ties within the same date still fall back to whatever
// secondary order UTable applies.
const sorting = ref([{ id: 'startDate', desc: false }])

// Grand total per numeric column, own `footer` on the leftmost column instead
// of a bare blank cell. averageOfAverages is the mean of each row's own
// average — not totalAmount / totalCount (the average of all transactions
// pooled together, which would weight tournaments with more transactions
// more heavily) — user request, 2026-08-23.
const totalCount = computed(() => rows.reduce((sum, row) => sum + row.count, 0))
const totalCompedCount = computed(() => rows.reduce((sum, row) => sum + row.compedCount, 0))
const totalAmount = computed(() => rows.reduce((sum, row) => sum + row.total, 0))
const averageOfAverages = computed(() =>
  rows.length ? rows.reduce((sum, row) => sum + row.average, 0) / rows.length : 0)

// Same UButton+StageLabel shape as the transactions table's own "Evento"
// column (useTransactionsTableColumns.ts) — a tournament reads the same way
// in both places.
const columns: TableColumn<FinanceTournamentSummaryRow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => sortableHeader(t('finance.summary.tournament'), column),
    // Same name across stages of the same league (e.g. every "Commander
    // Casual" tappa) ties on the raw string alone — broken by stageNumber
    // ascending, so "Commander Casual" 1ª/2ª/3ª/... sort in stage order
    // instead of whatever order they happened to land in the underlying Map
    // (user request, 2026-08-23: sorting "read as nonsensical").
    sortingFn: (rowA, rowB) => {
      const nameCompare = rowA.original.name.localeCompare(rowB.original.name)
      if (nameCompare !== 0) return nameCompare
      const stageCompare = (rowA.original.stageNumber ?? 0) - (rowB.original.stageNumber ?? 0)
      if (stageCompare !== 0) return stageCompare
      // Same name AND same stage number can still be two different
      // tournaments — e.g. "Commander Casual 1ª tappa" exists once in "Lega
      // Invernale 2026" and once in "Lega Estiva 2026" (user request,
      // 2026-08-24). League breaks the tie; standalone tournaments (no
      // league) sort last.
      return (rowA.original.league ?? '').localeCompare(rowB.original.league ?? '')
    },
    footer: () => t('finance.summary.total'),
    cell: ({ row }) => h(UButton, {
      to: tournamentDetailUrl(row.original),
      icon: PAYMENT_TYPE_BADGE_CONFIG['Tournament Fee'].icon,
      size: 'xs',
      color: 'neutral',
      variant: 'subtle'
    }, () => [
      row.original.name,
      row.original.stageNumber
        ? h(TournamentsStageLabel, { number: row.original.stageNumber, class: '!text-xs' })
        : null
    ])
  },
  {
    accessorKey: 'format',
    header: ({ column }) => sortableHeader(t('finance.summary.format'), column),
    cell: ({ row }) => h(FormatBadge, { format: row.original.format, icon: ICONS.gameplay })
  },
  {
    accessorKey: 'league',
    header: ({ column }) => sortableHeader(t('finance.summary.league'), column),
    meta: { class: { td: 'whitespace-nowrap' } },
    // Not every tournament belongs to a league (standalone tournaments have
    // league/leagueUuid both null) — empty cell for those, not a '—'
    // placeholder (user request, 2026-08-23).
    cell: ({ row }) => row.original.leagueUuid
      ? h(UButton, {
        to: `/leagues/${row.original.leagueUuid}`,
        label: row.original.league!,
        icon: ICONS.standings,
        size: 'xs',
        color: 'neutral',
        variant: 'subtle'
      })
      : null
  },
  {
    accessorKey: 'startDate',
    header: ({ column }) => sortableHeader(t('finance.summary.date'), column),
    meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
    cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.startDate })
  },
  summaryCountColumn('count', t('finance.summary.count'), totalCount),
  {
    ...summaryCountColumn<FinanceTournamentSummaryRow>(
      'compedCount', t('finance.summary.compedCount'), totalCompedCount
    ),
    // Blank instead of "0" for tournaments with no comped entries — a
    // column mostly full of zeros reads worse than blank space (same
    // convention as e.g. AssociatesGrowthChart's own zero-handling).
    cell: ({ row }) => row.original.compedCount || null
  },
  summaryAmountColumn('total', t('finance.summary.total'), amountFormatter, totalAmount),
  {
    accessorKey: 'average',
    header: ({ column }) => sortableHeader(t('finance.summary.average'), column),
    meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
    cell: ({ row }) => amountCell(row.original.average, amountFormatter),
    footer: () => h('span', { class: 'font-mono font-semibold' }, amountFormatter.format(averageOfAverages.value))
  }
]
</script>

<template>
  <FinanceSummaryCard
    :title="$t('finance.summary.byTournamentTitle')"
    :pending="pending"
    :columns-count="columns.length"
  >
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
    />
  </FinanceSummaryCard>
</template>
