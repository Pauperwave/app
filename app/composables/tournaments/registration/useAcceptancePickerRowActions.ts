// app\composables\tournaments\registration\useAcceptancePickerRowActions.ts
// Right-click context-menu item builders for AcceptancePicker.vue's two tables, extracted with
// useAcceptancePickerColumns.ts ("pure config, state threaded in"). Wiring comes from the shared
// useRowContextMenu.ts, like useWantedCardsRowActions.ts and the other row-actions composables.
import type { DropdownMenuItem } from '@nuxt/ui'
import type { PaymentMethod } from '#shared/types/transactions'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

type SourceRowStatus = 'pending' | 'accepted' | 'noShow'

// Right-clicking a row in the current multi-selection acts on the whole selection, not just that
// row: "clicked row decides the target action, selection decides the scope" for both tables'
// context menus below.
function resolveContextMenuTargets<T extends AcceptancePickerItem>(
  clicked: T, selection: T[]
): T[] {
  return selection.length > 1 && selection.some(selected => selected.value === clicked.value)
    ? selection
    : [clicked]
}

export interface UseAcceptancePickerRowActionsOptions {
  sourceRowStatus: (item: AcceptancePickerItem) => SourceRowStatus
  sourceSelection: ComputedRef<AcceptancePickerItem[]>
  transferToAccepted: (items: AcceptancePickerItem[]) => void
  setNoShow: (items: AcceptancePickerItem[], noShow: boolean) => void
  selectedAccepted: ComputedRef<AcceptancePickerItem[]>
  paymentMethodByPlayer: Record<string, PaymentMethod | null>
  paymentMethodOptions: PaymentMethod[]
  paymentMethodLabel: (option: PaymentMethod) => string
  setPaymentMethod: (item: AcceptancePickerItem, method: PaymentMethod | null) => void
  testPayments: Record<string, boolean>
  toggleTestPaymentForTargets: (items: AcceptancePickerItem[]) => void
  // Distinct from useAcceptancePickerColumns.ts's requestRemoveAccepted (single item, visible row
  // button): bulk-aware, fed resolveContextMenuTargets' wider selection
  requestRemoveAcceptedTargets: (items: AcceptancePickerItem[]) => void
}

export function useAcceptancePickerRowActions(options: UseAcceptancePickerRowActionsOptions) {
  const {
    sourceRowStatus, sourceSelection, transferToAccepted, setNoShow, selectedAccepted,
    paymentMethodByPlayer, paymentMethodOptions, paymentMethodLabel, setPaymentMethod,
    testPayments, toggleTestPaymentForTargets, requestRemoveAcceptedTargets
  } = options

  const { t } = useI18n()
  // The "Test" payment button is developer-only: a testing shortcut a real check-in desk shouldn't
  // see
  const { isDeveloperView } = useDeveloperView()

  // "Pre-registrati" side: mirrors the visible no-show toggle; empty for an already-accepted row
  // (like the button's `if (status === 'accepted') return null`)
  function sourceRowContextMenuItems(item: AcceptancePickerItem): DropdownMenuItem[] {
    const status = sourceRowStatus(item)
    if (status === 'accepted') return []

    const targets = resolveContextMenuTargets(item, sourceSelection.value)
    const markAsNoShow = status !== 'noShow'

    return [
      // Only for pending rows: a no-show shouldn't be silently accepted without clearing that
      // status. Same single-item vs whole-selection scope as the no-show action below
      ...(status === 'pending'
        ? [{
          label: targets.length > 1
            ? t('tournament.single.acceptancePicker.addToAcceptedMenuLabelBulk', { count: targets.length })
            : t('tournament.single.acceptancePicker.addToAcceptedMenuLabel'),
          icon: ICONS.playerConfirmed,
          onSelect: () => transferToAccepted(targets)
        }, { type: 'separator' as const }]
        : []),
      {
        label: targets.length > 1
          ? t(
            markAsNoShow
              ? 'tournament.single.acceptancePicker.markNoShowMenuLabelBulk'
              : 'tournament.single.acceptancePicker.unmarkNoShowMenuLabelBulk',
            { count: targets.length }
          )
          : t(
            markAsNoShow
              ? 'tournament.single.acceptancePicker.markNoShowMenuLabel'
              : 'tournament.single.acceptancePicker.unmarkNoShowMenuLabel'
          ),
        icon: ICONS.noShow,
        onSelect: () => setNoShow(targets, markAsNoShow)
      }
    ]
  }

  const {
    onRowContextmenu: onSourceRowContextmenu,
    tableContextMenuItems: sourceTableContextMenuItems
  } = useRowContextMenu(sourceRowContextMenuItems)

  // "Iscritti (Pagato)" side: mirrors the visible payment-method and remove buttons. Real payment
  // methods stay single-row (see setPaymentMethod); "Pagamento test" and remove are bulk-aware
  // (resolveContextMenuTargets), since remove is already one batched call and "Pagamento test"
  // never touches the network (see toggleTestPaymentForTargets)
  function acceptedRowContextMenuItems(item: AcceptancePickerItem): DropdownMenuItem[] {
    const method = paymentMethodByPlayer[item.value] ?? null
    const targets = resolveContextMenuTargets(item, selectedAccepted.value)
    const bulk = targets.length > 1

    return [
      ...paymentMethodOptions.map((option): DropdownMenuItem => {
        const badge = PAYMENT_METHOD_BADGE_CONFIG[option]
        const label = paymentMethodLabel(option)
        return {
          label,
          icon: badge.icon,
          color: method === option ? badge.color : undefined,
          onSelect: () => setPaymentMethod(item, method === option ? null : option)
        }
      }),
      ...(isDeveloperView.value
        ? [{
          label: bulk
            ? t('tournament.single.acceptancePicker.testPaymentLabelBulk', { count: targets.length })
            : t('tournament.single.acceptancePicker.testPaymentLabel'),
          icon: ICONS.flaskConical,
          color: testPayments[item.value] ? 'warning' as const : undefined,
          onSelect: () => toggleTestPaymentForTargets(targets)
        }]
        : []),
      { type: 'separator' as const },
      {
        label: bulk
          ? t('tournament.single.acceptancePicker.removeActionBulk', { count: targets.length })
          : t('tournament.single.acceptancePicker.removeAction'),
        icon: ICONS.delete,
        color: 'error' as const,
        onSelect: () => requestRemoveAcceptedTargets(targets)
      }
    ]
  }

  const {
    onRowContextmenu: onAcceptedRowContextmenu,
    tableContextMenuItems: acceptedTableContextMenuItems
  } = useRowContextMenu(acceptedRowContextMenuItems)

  return {
    sourceTableContextMenuItems,
    onSourceRowContextmenu,
    acceptedTableContextMenuItems,
    onAcceptedRowContextmenu
  }
}
