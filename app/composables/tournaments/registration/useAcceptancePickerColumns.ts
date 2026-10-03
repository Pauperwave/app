// app\composables\tournaments\registration\useAcceptancePickerColumns.ts
// Column definitions for AcceptancePicker.vue's two tables ("pure config, state threaded in", like
// useTournamentsTableColumns.ts). An options object rather than positional params: there are enough
// of them (selection handlers, status/no-show/payment callbacks)
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
  // "Test" payment button: marks a player as paid for testing without writing a pauperwave_payments
  // row. Its own record, not folded into paymentMethodByPlayer, which is synced from the real
  // payments query
  testPayments: Record<string, boolean>
  toggleTestPayment: (item: AcceptancePickerItem) => void
  requestRemoveAccepted: (item: AcceptancePickerItem) => void
  // Disables the no-show/payment/remove row buttons while their mutation is in flight (double-click
  // guard)
  isMutating: ComputedRef<boolean>
}

// Cash/POS/Comped only: the three that make sense at a live check-in desk (PayPal doesn't happen at
// the table). Icon/color come from PAYMENT_METHOD_BADGE_CONFIG; returned so AcceptancePicker.vue's
// bulk payment buttons/context menu share the list
const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['Cash', 'POS', 'Comped']
const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethod, string | null> = {
  Cash: 'transaction.addModal.paymentMethodOptions.cash',
  PayPal: null,
  POS: null,
  Comped: 'transaction.addModal.paymentMethodOptions.comped'
}

// Not a real PaymentMethod (ck_payment_method rejects it): deliberately not added to
// PAYMENT_METHODS or PAYMENT_METHOD_BADGE_CONFIG, which the real transactions list/filters share.
// It only toggles the local testPayments record
const TEST_PAYMENT_BADGE = { color: 'warning' as const, icon: ICONS.flaskConical }

export function useAcceptancePickerColumns(options: UseAcceptancePickerColumnsOptions) {
  const {
    sourceRowHandler, acceptedRowHandler, registrationOrderByValue, sourceRowStatus,
    toggleNoShow, acceptedAt, paymentMethodByPlayer, togglePaymentMethod, testPayments,
    toggleTestPayment, requestRemoveAccepted, isMutating
  } = options

  const { t } = useI18n()
  // The "Test" payment button is developer-only: a testing shortcut a real check-in desk shouldn't
  // see
  const { isDeveloperView } = useDeveloperView()

  function paymentMethodLabel(option: PaymentMethod): string {
    const labelKey = PAYMENT_METHOD_LABEL_KEYS[option]
    return labelKey ? t(labelKey) : option
  }

  function formatTime(date: Date | undefined): string {
    if (!date) return ''
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  // Date + time (unlike acceptedAt's time-only format): a pre-registration can be days old, so the
  // day matters
  function formatPreRegisteredAt(date: Date): string {
    return date.toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  // Select/index/player columns have the same shape in both tables (only the selection handler and
  // aria-label differ)
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

  // "Pre-registrati"-only variant of indexColumn: a static registration number instead of the live
  // row position
  const sourceIndexColumn: TableColumn<AcceptancePickerItem> = {
    id: 'index',
    header: '#',
    meta: { class: { th: 'w-10 text-right', td: 'w-10 text-right' } },
    cell: ({ row }) => registrationOrderByValue.value.get(row.original.value)
  }

  // sourceRowStatus() always resolves to 'accepted' for accepted-table rows (rendered from
  // targetItems), so a name is never struck through on "Iscritti (Pagato)", only on a
  // "Pre-registrati" no-show
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

  // "Iscritti (Pagato)"-only variant of playerColumn: sortable by name ("Pre-registrati" is already
  // sortable by registration time)
  const acceptedPlayerColumn: TableColumn<AcceptancePickerItem> = {
    accessorKey: 'label',
    header: ({ column }) =>
      sortableHeader(t('tournament.single.acceptancePicker.playerColumn'), column),
    meta: { class: { td: 'truncate' } },
    cell: playerColumnCell
  }

  // Overrides app.config.ts's table look for these two tables: keeps the vertical borders but drops
  // the scrollbar gutter. `table-fixed` + explicit column widths stop columns shifting as content
  // changes (table-layout:auto re-measures every render)
  const pickerTableUi = {
    root: 'border border-default rounded-lg [scrollbar-gutter:auto]',
    base: 'overflow-clip table-fixed'
  }

  // Row background per status, passed to the source UTable's `:meta`: Nuxt UI's Table.vue resolves
  // `meta.class.tr` per row (like `data-selected`)
  function sourceRowClass(item: AcceptancePickerItem): string {
    const status = sourceRowStatus(item)
    if (status === 'accepted') return 'bg-success/10 hover:bg-success/15'
    if (status === 'noShow') return 'bg-error/10 hover:bg-error/15 opacity-70'
    return ''
  }
  const sourceTableMeta = {
    class: { tr: (row: Row<AcceptancePickerItem>) => sourceRowClass(row.original) }
  }

  // "Pre-registrati" as a table: same shape as "Iscritti (Pagato)" (select / # / time / player)
  // plus a no-show toggle in place of payment/remove
  const sourceColumns: TableColumn<AcceptancePickerItem>[] = [
    createSelectColumn(
      sourceRowHandler, t('tournament.single.acceptancePicker.selectAllPreRegisteredAriaLabel')
    ),
    sourceIndexColumn,
    {
      id: 'time',
      accessorFn: row => row.preRegisteredAt,
      sortingFn: 'datetime',
      // sourceIndexColumn's "#" already shows registration order, so sorting this column is the
      // only way to see another order
      header: ({ column }) =>
        sortableHeader(t('tournament.single.acceptancePicker.registeredAtColumn'), column),
      // Wider than "Orario" on the accepted table (w-20): the sortable header needs room, and
      // table-fixed won't grow it
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
        // Already accepted: no-show no longer applies (handled from "Iscritti (Pagato)")
        if (status === 'accepted') return null
        return h(UButton, {
          'icon': ICONS.noShow,
          'color': status === 'noShow' ? 'error' : 'neutral',
          // 'outline', not 'ghost': an inactive toggle needs a visible border (same convention as
          // the payment-method buttons)
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

  // "Iscritti (Pagato)" as a table, not a UListbox (# / time / player / payment method / actions),
  // like league's WaitingListTable.vue
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
        const isTest = testPayments[item.value] ?? false
        return h(UFieldGroup, { size: 'sm' }, () => [
          ...PAYMENT_METHOD_OPTIONS.map((option) => {
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
          }),
          ...(isDeveloperView.value
            ? [h(UButton, {
              'key': 'test',
              'label': t('tournament.single.acceptancePicker.testPaymentLabel'),
              'icon': TEST_PAYMENT_BADGE.icon,
              'color': isTest ? TEST_PAYMENT_BADGE.color : 'neutral',
              'variant': isTest ? 'solid' : 'outline',
              'disabled': isMutating.value,
              'aria-label': t('tournament.single.acceptancePicker.testPaymentAriaLabel', {
                name: item.label
              }),
              'onClick': () => toggleTestPayment(item)
            })]
            : [])
        ])
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
