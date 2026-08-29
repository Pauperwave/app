// app\composables\associates\useAssociateTransactionsTableColumns.ts
// Extracted out of associate/[slug].vue (2026-08-29) — every other domain's
// table columns already live in their own use<Domain>TableColumns.ts
// (useTournamentsTableColumns.ts, useTransactionsTableColumns.ts, ...), this
// one was the odd one out, still inline in the detail page.
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Transaction, Tournament } from '~/types'
import {
  AssociateTag, DateWithRelativeTooltip, PaymentMethodBadge, PaymentTypeBadge,
  UBadge, UButton
} from '#components'

// Read-only summary, not the full /transactions table columns
// (useTransactionsTableColumns.ts) — no selection/grouping/row-actions here,
// this is a per-associate history embedded in a bigger detail page, not a
// management surface of its own. event_name/gettoni cells DO reuse that
// table's own rendering logic though (2026-08-25 fix) — this had drifted
// into just dumping row.original.event_name as raw text, which for
// historical imports meant literally showing strings like "PAUPER TAPPA 6"
// instead of the resolved tournament + stage number, and never splitting
// out gettoni-encoded rows into their own badge at all.
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
      // Only ever set for a Tournament Fee row whose tournament belongs to a
      // league (a tournament's league is optional/polymorphic, see the
      // project's own routing convention) — resolved the same way stageNumber
      // above is, off tournamentsByUuid rather than the transaction's own
      // embedded tournament sub-object, which only carries leagueUuid, not
      // the resolved name (user request, 2026-08-27).
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
      // parseTransactionNotes() only handles the unknown-email marker now —
      // the receipt number moved to its own receipt_ref column (migration
      // 20260825230000), read directly above instead of parsed out of notes.
      cell: ({ row }) => transactionNotesCell(row.original.notes, t('transaction.columns.unknownEmailTooltip'))
    }
  ]

  return { columns }
}
