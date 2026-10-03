// app\composables\associates\useAssociateTransactionsTableColumns.ts
// Extracted from associate/[slug].vue, like every other domain's use<Domain>TableColumns.ts
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Transaction, Tournament } from '~/types'
import {
  AssociateTag, DateWithRelativeTooltip, PaymentMethodBadge, PaymentTypeBadge,
  UBadge, UButton
} from '#components'

// Read-only summary, not the full /transactions columns (useTransactionsTableColumns.ts): no
// selection/grouping/row-actions, as this is a per-associate history in a detail page.
// event_name/gettoni cells DO reuse that table's rendering: dumping row.original.event_name showed
// raw strings ("PAUPER TAPPA 6") instead of the resolved tournament + stage number, and never split
// gettoni rows into their own badge
export function useAssociateTransactionsTableColumns(
  tournamentsByUuid: ComputedRef<Map<string, Tournament>>,
  amountFormatter: Intl.NumberFormat
) {
  const { t } = useI18n()

  const columns: TableColumn<Transaction>[] = [
    {
      accessorKey: 'payment_date',
      header: t('transaction.columns.paymentDate'),
      meta: { class: { td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => h(DateWithRelativeTooltip, { isoString: row.original.payment_date })
    },
    {
      accessorKey: 'payment_type',
      header: t('transaction.columns.paymentType'),
      meta: { class: { td: 'whitespace-nowrap' } },
      cell: ({ row }) => h(PaymentTypeBadge, { type: row.original.payment_type })
    },
    {
      accessorKey: 'payment_amount',
      header: t('transaction.columns.paymentAmount'),
      meta: { class: { td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => amountFormatter.format(row.original.payment_amount)
    },
    {
      accessorKey: 'payment_method',
      header: t('transaction.columns.paymentMethod'),
      meta: { class: { td: 'whitespace-nowrap' } },
      cell: ({ row }) => h(PaymentMethodBadge, { method: row.original.payment_method })
    },
    {
      accessorKey: 'received_by',
      header: t('transaction.columns.receivedBy'),
      meta: { class: { td: 'whitespace-nowrap' } },
      cell: ({ row }) => h(AssociateTag, { name: row.original.received_by })
    },
    {
      accessorKey: 'event_name',
      header: t('transaction.columns.event'),
      cell: ({ row }) => transactionEventNameCell(row.original, tournamentsByUuid)
    },
    {
      id: 'league',
      // Only set for a Tournament Fee whose tournament belongs to a league (a tournament's league
      // is optional/polymorphic): resolved off tournamentsByUuid like stageNumber above, since the
      // transaction's embedded tournament only carries leagueUuid, not the name
      accessorFn: (row) => {
        const uuid = row.tournament?.uuid
        return uuid ? tournamentsByUuid.value.get(uuid)?.league ?? null : null
      },
      header: t('transaction.columns.league'),
      cell: ({ row }) => {
        const tournament = row.original.tournament
        if (!tournament) return null
        const fullTournament = tournamentsByUuid.value.get(tournament.uuid)
        if (!fullTournament?.leagueUuid) return null
        return h(UButton, {
          to: `/leagues/${fullTournament.leagueUuid}`,
          label: fullTournament.league ?? undefined,
          size: 'xs',
          color: 'neutral',
          variant: 'subtle'
        })
      }
    },
    {
      id: 'gettoni',
      accessorFn: row => parseGettoniCount(row.event_name),
      header: t('transaction.columns.gettoni'),
      meta: { class: { th: 'text-center', td: 'text-center' } },
      cell: ({ getValue }) => transactionGettoniCell(getValue<number | null>())
    },
    {
      accessorKey: 'receipt_ref',
      header: t('transaction.columns.receipt'),
      meta: { class: { th: 'text-center', td: 'text-center' } },
      cell: ({ row }) => {
        const receiptRef = row.original.receipt_ref
        if (!receiptRef) return null
        return h(UBadge, { variant: 'subtle', color: 'neutral', icon: ICONS.receipt, label: receiptRef })
      }
    },
    {
      accessorKey: 'notes',
      header: t('transaction.columns.notes'),
      // parseTransactionNotes() only handles the unknown-email marker; the receipt number is the
      // receipt_ref column (migration 20260825230000)
      cell: ({ row }) => transactionNotesCell(row.original.notes, t('transaction.columns.unknownEmailTooltip'))
    }
  ]

  return { columns }
}
