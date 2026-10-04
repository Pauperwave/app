// app\composables\transactions\useTransactionsTableColumns.ts
import {
  AssociateTag, UBadge, UIcon
} from '#components'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Transaction } from '~/types'
import type { Selection } from '~/composables/useSelection'
import type { RenewalKind } from '~/utils/transactions/renewalKindBadge'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'
import PaymentMethodBadge from '~/components/ui/PaymentMethodBadge.vue'
import RenewalKindBadge from '~/components/ui/RenewalKindBadge.vue'
import RowActionsMenu from '~/components/ui/RowActionsMenu.vue'

export const transactionsColumnHeaders = (t: (key: string) => string) => ({
  id: t('transaction.columns.id'),
  payer: t('transaction.columns.payer'),
  payment_date: t('transaction.columns.paymentDate'),
  payment_type: t('transaction.columns.paymentType'),
  renewalKind: t('transaction.columns.renewalKind'),
  payment_amount: t('transaction.columns.paymentAmount'),
  payment_method: t('transaction.columns.paymentMethod'),
  received_by: t('transaction.columns.receivedBy'),
  event_name: t('transaction.columns.event'),
  gettoni: t('transaction.columns.gettoni'),
  receipt_ref: t('transaction.columns.receipt'),
  notes: t('transaction.columns.notes'),
  createdBy: t('transaction.columns.createdBy'),
  createdAt: t('transaction.columns.createdAt'),
  updatedBy: t('transaction.columns.updatedBy'),
  updatedAt: t('transaction.columns.updatedAt'),
  actions: t('transaction.columns.actions')
} as const)

// selection: threaded through, not read from a composable (that state, useSelection.ts, is owned by
// the page), like useTournamentsTableColumns.ts/useWantedCardsTableColumns.ts. Grouping (by payer)
// is on here, so the select column comes from useGroupedSelectColumn.ts (a group's checkbox drives
// all its subRows), not tournaments' simpler ungrouped one.
export function useTransactionsTableColumns(
  selection: Selection<number>,
  rowContextMenuItems: (transaction: Transaction) => DropdownMenuItem[]
) {
  const { t } = useI18n()

  const columnHeaders = transactionsColumnHeaders(t)

  const amountFormatter = AMOUNT_FORMATTER

  const tournamentsByUuid = useTournamentsByUuid()

  // Earliest renewal_year on record per associate: an Association Fee is a "Nuovo tesseramento" if
  // its year is the earliest, else a "Rinnovo". Full history (not just latest_renewal_year), like
  // useAssociatesStatistics.ts's growthSeries
  const { data: associateRenewals } = useAssociateRenewalsQuery()
  const earliestRenewalYearByAssociate = computed(() => {
    const map = new Map<string, number>()
    for (const renewal of associateRenewals.value ?? []) {
      const earliest = map.get(renewal.associateUuid)
      if (earliest === undefined || renewal.renewalYear < earliest) {
        map.set(renewal.associateUuid, renewal.renewalYear)
      }
    }
    return map
  })

  const selectColumn = useGroupedSelectColumn<Transaction>(selection)

  const columns: TableColumn<Transaction>[] = [
    selectColumn,
    {
      accessorKey: 'id',
      header: ({ column }) => sortableHeader(columnHeaders.id, column),
      meta: { class: { th: 'whitespace-nowrap text-right', td: 'whitespace-nowrap font-mono text-dimmed text-right' } },
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.id
    },
    {
      id: 'payer',
      // Own accessorFn (the payer name isn't a single raw column): a real accessor so grouping
      // (getGroupedRowModel) has a value to group by, like wanted-cards' player column
      accessorFn: transactionPayerName,
      header: ({ column }) => sortableHeader(columnHeaders.payer, column),
      // Sorts groups by number of transactions (subRows), not alphabetically —
      // more useful once the table is grouped by payer.
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        const name = getValue<string>()
        const associateUuid = row.original.associate?.uuid ?? null
        if (row.getIsGrouped()) {
          return h('button', {
            type: 'button',
            class: 'flex items-center gap-1.5 font-medium cursor-pointer',
            onClick: () => row.toggleExpanded()
          }, [
            h(UIcon, {
              name: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
              class: 'size-4'
            }),
            h(AssociateTag, { name: name || columnHeaders.payer, associateUuid }),
            h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
          ])
        }
        if (!name) return ''
        return h(AssociateTag, { name, associateUuid })
      }
    },
    {
      accessorKey: 'payment_date',
      header: ({ column }) => sortableHeader(columnHeaders.payment_date, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.payment_date })
    },
    {
      accessorKey: 'payment_type',
      header: ({ column }) => sortableHeader(columnHeaders.payment_type, column),
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(PaymentTypeBadge, { type: row.original.payment_type })
    },
    {
      id: 'renewalKind',
      // Own accessorFn (not a raw column). 'unlinked'/'guest' flag real data gaps (see
      // renewalKindBadge.ts) instead of rendering blank
      accessorFn: (row): RenewalKind | null => {
        if (row.payment_type !== 'Association Fee') return isUnregisteredParticipant(row) ? 'guest' : null
        if (!row.associate) return 'unlinked'
        const earliestYear = earliestRenewalYearByAssociate.value.get(row.associate.uuid)
        if (earliestYear === undefined) return null
        return new Date(row.payment_date).getFullYear() === earliestYear ? 'new' : 'renewal'
      },
      header: columnHeaders.renewalKind,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row, getValue }) => {
        if (row.getIsGrouped()) return null
        const kind = getValue<RenewalKind | null>()
        return kind ? h(RenewalKindBadge, { kind }) : null
      }
    },
    {
      accessorKey: 'payment_amount',
      header: ({ column }) => sortableHeader(columnHeaders.payment_amount, column),
      meta: { class: { th: 'whitespace-nowrap text-right', td: 'whitespace-nowrap font-mono text-right' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : amountFormatter.format(row.original.payment_amount)
    },
    {
      accessorKey: 'payment_method',
      header: columnHeaders.payment_method,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(PaymentMethodBadge, { method: row.original.payment_method })
    },
    {
      accessorKey: 'received_by',
      header: columnHeaders.received_by,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      // No associateUuid: staff aren't reliably resolvable to an associate by name, so just
      // name+avatar, no membership popover (see AssociateTag.vue)
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(AssociateTag, { name: row.original.received_by })
    },
    {
      accessorKey: 'event_name',
      header: columnHeaders.event_name,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      // Same UButton for tournament/event: a plain NuxtLink+icon for events read as a different
      // affordance. Shared with useAssociateTransactionsTableColumns.ts's event_name cell
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : transactionEventNameCell(row.original, tournamentsByUuid)
    },
    {
      id: 'gettoni',
      accessorFn: row => parseGettoniCount(row.event_name),
      header: columnHeaders.gettoni,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row, getValue }) => row.getIsGrouped()
        ? null
        : transactionGettoniCell(getValue<number | null>())
    },
    {
      accessorKey: 'receipt_ref',
      header: columnHeaders.receipt_ref,
      meta: { class: { th: 'whitespace-nowrap text-center', td: 'whitespace-nowrap text-center' } },
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const receiptRef = row.original.receipt_ref
        if (!receiptRef) return null
        return h(UBadge, { variant: 'subtle', color: 'neutral', icon: ICONS.receipt, label: receiptRef })
      }
    },
    {
      accessorKey: 'notes',
      header: columnHeaders.notes,
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : transactionNotesCell(row.original.notes, t('transaction.columns.unknownEmailTooltip'))
    },
    {
      accessorKey: 'createdBy',
      header: columnHeaders.createdBy,
      cell: ({ row }) => auditAssociateCell(row.getIsGrouped(), row.original.createdBy)
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => sortableHeader(columnHeaders.createdAt, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.created_at })
    },
    {
      accessorKey: 'updatedBy',
      header: columnHeaders.updatedBy,
      cell: ({ row }) => auditAssociateCell(row.getIsGrouped(), row.original.updatedBy)
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => sortableHeader(columnHeaders.updatedAt, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.updated_at })
    },
    {
      id: 'actions',
      header: columnHeaders.actions,
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(RowActionsMenu, { items: rowContextMenuItems(row.original) })
    }
  ]

  return { columnHeaders, columns }
}
