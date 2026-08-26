// app\composables\tournaments\useAcceptancePickerColumns.ts
// Column definitions for AcceptancePicker.vue's two tables — extracted once
// they made up roughly half that file's length (user request, 2026-08-24),
// same "pure config, state threaded in" shape as useTournamentsTableColumns.ts.
// An options object, not positional params, since there are enough of them
// (row-selection handlers, status/no-show/payment callbacks) that positional
// args would read worse than named ones here.
import { h } from 'vue'
import { UButton, UCheckbox, UFieldGroup } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Row, Table } from '@tanstack/vue-table'
import type { PaymentMethod } from '#shared/types/transactions'
import AssociateTag from '~/components/ui/AssociateTag.vue'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

type SourceRowStatus = 'pending' | 'accepted' | 'noShow'

interface RowSelectionHandler {
  handleCheckboxClick: (event: MouseEvent) => void
  toggleFromCheckbox: <T>(table: Table<T>, row: Row<T>, value: boolean) => void
}

export interface UseAcceptancePickerColumnsOptions {
  sourceRowHandler: RowSelectionHandler
  acceptedRowHandler: RowSelectionHandler
  registrationOrderByValue: ComputedRef<Map<string, number>>
  sourceRowStatus: (item: AcceptancePickerItem) => SourceRowStatus
  toggleNoShow: (item: AcceptancePickerItem) => void
  acceptedAt: Record<string, Date>
  paymentMethodByPlayer: Record<string, PaymentMethod | null>
  togglePaymentMethod: (item: AcceptancePickerItem, method: PaymentMethod) => void
  requestRemoveAccepted: (item: AcceptancePickerItem) => void
  // Disables the no-show/payment/remove row buttons while their mutation is
  // in flight — a double-click guard against firing the same write twice
  // before the first round-trip resolves (user request, 2026-08-25).
  isMutating: ComputedRef<boolean>
}

// Cash/POS/Comped only — the three that make sense at a live check-in desk
// (PayPal doesn't happen at the table). Icon/color reused from
// PAYMENT_METHOD_BADGE_CONFIG (paymentMethodBadge.ts), same source
// PaymentMethodBadge.vue itself reads from. Returned (not just used
// internally) since AcceptancePicker.vue's own bulk payment buttons/context
// menu need the same list + label logic.
const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['Cash', 'POS', 'Comped']
const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethod, string | null> = {
  Cash: 'transaction.addModal.paymentMethodOptions.cash',
  PayPal: null,
  POS: null,
  Comped: 'transaction.addModal.paymentMethodOptions.comped'
}

export function useAcceptancePickerColumns(options: UseAcceptancePickerColumnsOptions) {
  const {
    sourceRowHandler, acceptedRowHandler, registrationOrderByValue, sourceRowStatus,
    toggleNoShow, acceptedAt, paymentMethodByPlayer, togglePaymentMethod, requestRemoveAccepted,
    isMutating
  } = options

  const { t } = useI18n()

  function paymentMethodLabel(option: PaymentMethod): string {
    const labelKey = PAYMENT_METHOD_LABEL_KEYS[option]
    return labelKey ? t(labelKey) : option
  }

  function formatTime(date: Date | undefined): string {
    if (!date) return ''
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  // Date + time (not just time, unlike acceptedAt's formatTime above) — a
  // pre-registration can be days old by the time acceptance runs, so the day
  // matters here.
  function formatPreRegisteredAt(date: Date): string {
    return date.toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  // Select/index/player columns are identical in shape between the two
  // tables (only the row-selection handler and its aria-label differ) —
  // factored out once rather than duplicated, per the "identical call
  // sites" dedup bar.
  function createSelectColumn(
    handler: RowSelectionHandler, selectAllAriaLabel: string
  ): TableColumn<AcceptancePickerItem> {
    return {
      id: 'select',
      enableHiding: false,
      header: ({ table }) => h(UCheckbox, {
        'modelValue': table.getIsAllPageRowsSelected()
          ? true
          : table.getIsSomePageRowsSelected() ? 'indeterminate' : false,
        'onUpdate:modelValue': (value: unknown) =>
          table.toggleAllPageRowsSelected(!!(value as boolean)),
        'aria-label': selectAllAriaLabel
      }),
      cell: ({ row, table }) => h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'disabled': !row.getCanSelect(),
        'onUpdate:modelValue': (value: unknown) =>
          handler.toggleFromCheckbox(table, row, !!(value as boolean)),
        'onClick': handler.handleCheckboxClick,
        'aria-label': t('tournament.single.acceptancePicker.selectRowAriaLabel', {
          name: row.original.label
        })
      }),
      meta: { class: { th: 'w-10', td: 'w-10' } }
    }
  }

  const indexColumn: TableColumn<AcceptancePickerItem> = {
    id: 'index',
    header: '#',
    meta: { class: { th: 'w-10 text-right', td: 'w-10 text-right' } },
    cell: ({ row }) => row.index + 1
  }

  // "Pre-registrati"-only variant of indexColumn above — a static
  // registration number instead of the live row position.
  const sourceIndexColumn: TableColumn<AcceptancePickerItem> = {
    id: 'index',
    header: '#',
    meta: { class: { th: 'w-10 text-right', td: 'w-10 text-right' } },
    cell: ({ row }) => registrationOrderByValue.value.get(row.original.value)
  }

  // sourceRowStatus() always resolves to 'accepted' for accepted-table rows
  // (they're only ever rendered from targetItems, which is exactly what it
  // checks first), so reusing it here never strikes through a name on the
  // "Iscritti (Pagato)" side — only a "Pre-registrati" no-show does.
  const playerColumnCell: TableColumn<AcceptancePickerItem>['cell'] = ({ row }) =>
    h(AssociateTag, {
      name: row.original.label,
      size: 'md',
      strikethrough: sourceRowStatus(row.original) === 'noShow'
    })

  const playerColumn: TableColumn<AcceptancePickerItem> = {
    accessorKey: 'label',
    header: t('tournament.single.acceptancePicker.playerColumn'),
    meta: { class: { td: 'truncate' } },
    cell: playerColumnCell
  }

  // "Iscritti (Pagato)"-only variant of playerColumn above — sortable, since
  // that table (unlike "Pre-registrati", already sortable by registration
  // time) had no way to reorder by name (user request, 2026-08-27).
  const acceptedPlayerColumn: TableColumn<AcceptancePickerItem> = {
    accessorKey: 'label',
    header: ({ column }) =>
      sortableHeader(t('tournament.single.acceptancePicker.playerColumn'), column),
    meta: { class: { td: 'truncate' } },
    cell: playerColumnCell
  }

  // Overrides app.config.ts's app-wide table look for just these two
  // tables — keeps the vertical cell borders, just drops the reserved
  // scrollbar gutter these lists don't need. `table-fixed` + every column's
  // own explicit width stop the columns reflowing/shifting horizontally as
  // row content changes — table-layout:auto re-measures every visible
  // row's content on each render, table-fixed locks widths to the declared
  // ones instead.
  const pickerTableUi = {
    root: 'border border-default rounded-lg [scrollbar-gutter:auto]',
    base: 'overflow-clip table-fixed'
  }

  // Row background per status — passed to the source UTable's `:meta`
  // prop, which Nuxt UI's Table.vue resolves per-row via
  // `resolveValue(meta.class.tr, row)`, same mechanism as its own
  // `data-selected` styling.
  function sourceRowClass(item: AcceptancePickerItem): string {
    const status = sourceRowStatus(item)
    if (status === 'accepted') return 'bg-success/10 hover:bg-success/15'
    if (status === 'noShow') return 'bg-error/10 hover:bg-error/15 opacity-70'
    return ''
  }
  const sourceTableMeta = {
    class: { tr: (row: Row<AcceptancePickerItem>) => sourceRowClass(row.original) }
  }

  // "Pre-registrati" as a table — same shape as "Iscritti (Pagato)" below
  // (select / # / time / player), plus its own no-show toggle where the
  // target side has payment/remove instead.
  const sourceColumns: TableColumn<AcceptancePickerItem>[] = [
    createSelectColumn(
      sourceRowHandler, t('tournament.single.acceptancePicker.selectAllPreRegisteredAriaLabel')
    ),
    sourceIndexColumn,
    {
      id: 'time',
      accessorFn: row => row.preRegisteredAt,
      sortingFn: 'datetime',
      // sourceIndexColumn's own "#" already reflects registration order, so
      // sorting this column is the only way to see it any other way.
      header: ({ column }) =>
        sortableHeader(t('tournament.single.acceptancePicker.registeredAtColumn'), column),
      // Wider than the plain "Orario" column on the accepted table (w-20)
      // — the sortable header's icon+label needs more room, and
      // table-fixed (see pickerTableUi) won't let it grow past this on its
      // own like a normal table would.
      meta: { class: { th: 'text-center w-40', td: 'text-center font-mono' } },
      cell: ({ row }) => formatPreRegisteredAt(row.original.preRegisteredAt)
    },
    playerColumn,
    {
      id: 'noShow',
      header: t('tournament.single.acceptancePicker.noShowColumn'),
      meta: { class: { th: 'text-center w-28 whitespace-nowrap', td: 'text-center' } },
      cell: ({ row }) => {
        const item = row.original
        const status = sourceRowStatus(item)
        // Already accepted — no-show no longer makes sense, handled from
        // "Iscritti (Pagato)" instead.
        if (status === 'accepted') return null
        return h(UButton, {
          'icon': ICONS.noShow,
          'color': status === 'noShow' ? 'error' : 'neutral',
          // 'outline', not 'ghost' — an inactive toggle needs a visible
          // border to be noticed at all, same active/inactive convention
          // as the payment-method buttons below.
          'variant': status === 'noShow' ? 'solid' : 'outline',
          'size': 'xs',
          'class': 'w-full justify-center',
          'disabled': isMutating.value,
          'aria-label': t(
            status === 'noShow'
              ? 'tournament.single.acceptancePicker.unmarkNoShowAriaLabel'
              : 'tournament.single.acceptancePicker.markNoShowAriaLabel',
            { name: item.label }
          ),
          'onClick': () => toggleNoShow(item)
        })
      }
    }
  ]

  // "Iscritti (Pagato)" as a table, not a UListbox — same shape as
  // MagicTheGathering/league's own registration-phase WaitingListTable.vue
  // (# / time / player / payment method / actions).
  const acceptedColumns: TableColumn<AcceptancePickerItem>[] = [
    createSelectColumn(
      acceptedRowHandler, t('tournament.single.acceptancePicker.selectAllRegisteredAriaLabel')
    ),
    indexColumn,
    {
      id: 'time',
      header: t('tournament.single.acceptancePicker.timeColumn'),
      meta: { class: { th: 'text-center w-20', td: 'text-center font-mono' } },
      cell: ({ row }) => formatTime(acceptedAt[row.original.value])
    },
    acceptedPlayerColumn,
    {
      id: 'paymentMethod',
      header: t('tournament.single.acceptancePicker.paymentColumn'),
      meta: { class: { th: 'text-center w-56', td: 'text-center' } },
      cell: ({ row }) => {
        const item = row.original
        const method = paymentMethodByPlayer[item.value] ?? null
        return h(UFieldGroup, { size: 'xs' }, () => PAYMENT_METHOD_OPTIONS.map((option) => {
          const badge = PAYMENT_METHOD_BADGE_CONFIG[option]
          const label = paymentMethodLabel(option)
          return h(UButton, {
            'key': option,
            'label': label,
            'icon': badge.icon,
            'color': method === option ? badge.color : 'neutral',
            'variant': method === option ? 'solid' : 'outline',
            'disabled': isMutating.value,
            'aria-label': t('tournament.single.acceptancePicker.paymentAriaLabel', {
              method: label, name: item.label
            }),
            'onClick': () => togglePaymentMethod(item, option)
          })
        }))
      }
    },
    {
      id: 'actions',
      header: t('tournament.single.acceptancePicker.actionsColumn'),
      meta: { class: { th: 'text-center w-20', td: 'text-center' } },
      cell: ({ row }) => h(UButton, {
        'icon': ICONS.delete,
        'color': 'error',
        'variant': 'ghost',
        'size': 'xs',
        'disabled': isMutating.value,
        'aria-label': t(
          'tournament.single.acceptancePicker.removeAriaLabel', { name: row.original.label }
        ),
        'onClick': () => requestRemoveAccepted(row.original)
      })
    }
  ]

  return {
    sourceColumns,
    acceptedColumns,
    pickerTableUi,
    sourceTableMeta,
    paymentMethodOptions: PAYMENT_METHOD_OPTIONS,
    paymentMethodLabel
  }
}
