// app\composables\transactions\useTransactionsTableColumns.ts
import { AssociateTag, UBadge, UIcon } from '#components'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Transaction } from '~/types'
import type { Selection } from '~/composables/useSelection'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import PaymentTypeBadge from '~/components/ui/PaymentTypeBadge.vue'
import RowActionsMenu from '~/components/ui/RowActionsMenu.vue'

export const transactionsColumnHeaders = (t: (key: string) => string) => ({
  payer: t('transaction.columns.payer'),
  payment_date: t('transaction.columns.paymentDate'),
  payment_type: t('transaction.columns.paymentType'),
  payment_amount: t('transaction.columns.paymentAmount'),
  payment_method: t('transaction.columns.paymentMethod'),
  received_by: t('transaction.columns.receivedBy'),
  event_name: t('transaction.columns.event'),
  notes: t('transaction.columns.notes'),
  createdBy: t('transaction.columns.createdBy'),
  createdAt: t('transaction.columns.createdAt'),
  updatedBy: t('transaction.columns.updatedBy'),
  updatedAt: t('transaction.columns.updatedAt'),
  actions: t('transaction.columns.actions')
} as const)

// selection: threaded through rather than read from a composable here, same
// reasoning as useTournamentsTableColumns.ts/useWantedCardsTableColumns.ts —
// that state (useSelection.ts) is owned by the page. Grouping (by payer) is
// on here, unlike tournaments, so the select column comes from
// useGroupedSelectColumn.ts (a group's checkbox drives all its subRows),
// not tournaments' simpler ungrouped one.
export function useTransactionsTableColumns(
  selection: Selection<number>,
  rowContextMenuItems: (transaction: Transaction) => DropdownMenuItem[]
) {
  const { t } = useI18n()

  const columnHeaders = transactionsColumnHeaders(t)

  const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

  const selectColumn = useGroupedSelectColumn<Transaction>(selection)

  const columns: TableColumn<Transaction>[] = [
    selectColumn,
    {
      id: 'payer',
      // Own accessorFn (not accessorKey) since the payer name isn't a single
      // raw column on the row. Needed as a real accessor (not just a synthetic
      // cell) so grouping (getGroupedRowModel) has a value to group by — same
      // reasoning as wanted-cards' player column.
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
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(PaymentTypeBadge, { type: row.original.payment_type })
    },
    {
      accessorKey: 'payment_amount',
      header: ({ column }) => sortableHeader(columnHeaders.payment_amount, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : amountFormatter.format(row.original.payment_amount)
    },
    {
      accessorKey: 'payment_method',
      header: columnHeaders.payment_method,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.payment_method
    },
    {
      accessorKey: 'received_by',
      header: columnHeaders.received_by,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      // No associateUuid — staff members aren't reliably resolvable to an
      // associate record by name alone, so this is just name+avatar, no
      // membership popover (see AssociateTag.vue).
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(AssociateTag, { name: row.original.received_by })
    },
    {
      accessorKey: 'event_name',
      header: columnHeaders.event_name,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      cell: ({ row }) => row.getIsGrouped() ? null : (row.original.event_name ?? '')
    },
    {
      accessorKey: 'notes',
      header: columnHeaders.notes,
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.notes
    },
    {
      accessorKey: 'createdBy',
      header: columnHeaders.createdBy,
      cell: ({ row }) => row.getIsGrouped() || !row.original.createdBy
        ? null
        : h(AssociateTag, { name: row.original.createdBy })
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
      cell: ({ row }) => row.getIsGrouped() || !row.original.updatedBy
        ? null
        : h(AssociateTag, { name: row.original.updatedBy })
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
