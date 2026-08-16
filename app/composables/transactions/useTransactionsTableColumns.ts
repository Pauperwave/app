// app\composables\transactions\useTransactionsTableColumns.ts
import { PlayerTag, UBadge, UCheckbox, UIcon } from '#components'
import type { BadgeProps, TableColumn } from '@nuxt/ui'
import type { PaymentType } from '#shared/types/transactions'
import type { Transaction } from '~/types'
import type { Selection } from '~/composables/useSelection'

export const transactionsColumnHeaders = (t: (key: string) => string) => ({
  payer: t('transaction.columns.payer'),
  payment_date: t('transaction.columns.paymentDate'),
  payment_type: t('transaction.columns.paymentType'),
  payment_amount: t('transaction.columns.paymentAmount'),
  payment_method: t('transaction.columns.paymentMethod'),
  received_by: t('transaction.columns.receivedBy'),
  event_name: t('transaction.columns.event'),
  notes: t('transaction.columns.notes')
} as const)

const PAYMENT_TYPE_BADGE_CONFIG: Record<PaymentType, { color: BadgeProps['color'], icon: string }> = {
  'Association Fee': { color: 'primary', icon: ICONS.players },
  'Tournament Fee': { color: 'success', icon: ICONS.standings },
  'Event Fee': { color: 'warning', icon: ICONS.calendar },
  'Donation': { color: 'neutral', icon: ICONS.heartHandshake }
}

// selection: threaded through rather than read from a composable here, same
// reasoning as useTournamentsTableColumns.ts/useWantedCardsTableColumns.ts —
// that state (useSelection.ts) is owned by the page. Grouping (by payer) is
// on here, unlike tournaments, so the select column follows
// useWantedCardsTableColumns.ts's shape (a group's checkbox drives all its
// subRows), not tournaments' simpler ungrouped one.
export function useTransactionsTableColumns(selection: Selection<number>) {
  const { t } = useI18n()

  const columnHeaders = transactionsColumnHeaders(t)

  const dateFormatter = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const amountFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

  let lastClickShiftKey = false

  const selectColumn: TableColumn<Transaction> = {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-px p-0', td: 'w-px p-0' } },
    header: ({ table: tableApi }) => {
      const leafRows = tableApi.getFilteredRowModel().rows.filter(row => row.subRows.length === 0)
      const ids = leafRows.map(row => row.original.id)
      const allSelected = ids.length > 0 && ids.every(id => selection.isSelected(id))
      const someSelected = ids.some(id => selection.isSelected(id))
      return centerTableCell(h(UCheckbox, {
        'modelValue': allSelected ? true : (someSelected ? 'indeterminate' : false),
        'onUpdate:modelValue': (value: unknown) => selection.setAll(ids, !!value),
        'aria-label': t('common.selectAll')
      }))
    },
    cell: ({ row, table: tableApi }) => {
      if (row.getIsGrouped()) {
        const ids = row.subRows.map(subRow => subRow.original.id)
        const allSelected = ids.length > 0 && ids.every(id => selection.isSelected(id))
        const someSelected = ids.some(id => selection.isSelected(id))
        return centerTableCell(h(UCheckbox, {
          'modelValue': allSelected ? true : (someSelected ? 'indeterminate' : false),
          'onUpdate:modelValue': (value: unknown) => selection.setAll(ids, !!value),
          'aria-label': t('common.selectRow')
        }))
      }
      const leafRows = tableApi.getFilteredRowModel().rows.filter(r => r.subRows.length === 0)
      const range = leafRows.map(r => r.original.id)
      return centerTableCell(h(UCheckbox, {
        'modelValue': selection.isSelected(row.original.id),
        'onUpdate:modelValue': () =>
          selection.toggle(row.original.id, { shiftKey: lastClickShiftKey, range }),
        'onClick': (e: MouseEvent) => { lastClickShiftKey = e.shiftKey },
        'aria-label': t('common.selectRow')
      }))
    }
  }

  // Own accessorFn (not accessorKey) since the payer name isn't a single raw
  // column on the row — it's derived from either the linked associate or the
  // external payer_name/payer_surname pair. Needed as a real accessor (not just
  // a synthetic cell) so grouping (getGroupedRowModel) has a value to group by —
  // same reasoning as wanted-cards' player column.
  function payerName(transaction: Transaction) {
    const { associate, payer_name, payer_surname } = transaction
    return associate
      ? `${associate.first_name} ${associate.last_name}`
      : (payer_name && payer_surname ? `${payer_name} ${payer_surname}` : '')
  }

  const columns: TableColumn<Transaction>[] = [
    selectColumn,
    {
      id: 'payer',
      accessorFn: payerName,
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
            h(PlayerTag, { name: name || columnHeaders.payer, associateUuid }),
            h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
          ])
        }
        if (!name) return ''
        return h(PlayerTag, { name, associateUuid })
      }
    },
    {
      accessorKey: 'payment_date',
      header: ({ column }) => sortableHeader(columnHeaders.payment_date, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) =>
        row.getIsGrouped() ? null : dateFormatter.format(new Date(row.original.payment_date))
    },
    {
      accessorKey: 'payment_type',
      header: ({ column }) => sortableHeader(columnHeaders.payment_type, column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap' } },
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const type = row.original.payment_type
        const { color, icon } = PAYMENT_TYPE_BADGE_CONFIG[type] ?? { color: 'neutral' as const, icon: ICONS.help }
        return h(UBadge, { variant: 'subtle', icon, color, label: type })
      }
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
      // membership popover (see PlayerTag.vue).
      cell: ({ row }) =>
        row.getIsGrouped() ? null : h(PlayerTag, { name: row.original.received_by })
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
    }
  ]

  return { columnHeaders, columns }
}
