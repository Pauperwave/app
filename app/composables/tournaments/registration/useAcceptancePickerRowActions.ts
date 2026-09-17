// app\composables\tournaments\registration\useAcceptancePickerRowActions.ts
// Right-click context-menu item builders for AcceptancePicker.vue's two
// tables, extracted alongside useAcceptancePickerColumns.ts (same "pure
// config, state threaded in" shape) — the component used to hand-roll its
// own contextMenuRow/onRowContextmenu/tableContextMenuItems wiring for both
// tables instead of calling the shared useRowContextMenu.ts composable
// already used by useWantedCardsRowActions.ts/useTransactionsRowActions.ts/
// useAssociatesRowActions.ts for exactly this.
import type { DropdownMenuItem } from '@nuxt/ui'
import type { PaymentMethod } from '#shared/types/transactions'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

type SourceRowStatus = 'pending' | 'accepted' | 'noShow'

// Right-clicking a row that's part of the current multi-selection acts on
// the whole selection, not just that one row (user request, 2026-08-24: "the
// contextual menu actions should work on every selected item") — same
// "clicked row decides the target action, selection decides the scope"
// convention for both tables' context menus below.
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
  // Named distinctly from useAcceptancePickerColumns.ts's own
  // requestRemoveAccepted (single item, for the visible row button) — this
  // one is bulk-aware, fed resolveContextMenuTargets' wider selection.
  requestRemoveAcceptedTargets: (items: AcceptancePickerItem[]) => void
}

export function useAcceptancePickerRowActions(options: UseAcceptancePickerRowActionsOptions) {
  const {
    sourceRowStatus, sourceSelection, transferToAccepted, setNoShow, selectedAccepted,
    paymentMethodByPlayer, paymentMethodOptions, paymentMethodLabel, setPaymentMethod,
    testPayments, toggleTestPaymentForTargets, requestRemoveAcceptedTargets
  } = options

  const { t } = useI18n()
  // "Test" payment button is developer-only (user request, 2026-09-18) —
  // a testing shortcut, not something a real check-in desk should see.
  const { isDeveloperView } = useDeveloperView()

  // "Pre-registrati" side (user request, 2026-08-24) — mirrors the visible
  // no-show toggle button; empty for an already-accepted row (nothing left
  // to do from this side, same as the button's own
  // `if (status === 'accepted') return null`).
  function sourceRowContextMenuItems(item: AcceptancePickerItem): DropdownMenuItem[] {
    const status = sourceRowStatus(item)
    if (status === 'accepted') return []

    const targets = resolveContextMenuTargets(item, sourceSelection.value)
    const markAsNoShow = status !== 'noShow'

    return [
      // Only for pending rows — a no-show shouldn't be silently accepted
      // without first clearing that status (user request, 2026-08-24:
      // "Aggiungi l'azione di 'Aggiunta agli iscritti'"), same single-item
      // vs. whole-selection scope as the no-show action below.
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

  // "Iscritti (Pagato)" side (user request, 2026-08-24) — mirrors the
  // visible payment-method buttons + remove button. Real payment methods
  // stay single-row (see setPaymentMethod's own comment); "Pagamento test"
  // and remove are both bulk-aware (resolveContextMenuTargets) — remove
  // because it's already one batched network call, "Pagamento test" because
  // it never touches the network at all (see toggleTestPaymentForTargets's
  // own comment).
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
