// app\composables\associates\useAssociatesRowActions.ts
// Row actions (currently just "Modifica"), plus the edit-modal state they open —
// shared by associates/index.vue, associates/requests.vue and associate/[slug].vue,
// each calling this fresh (same convention as useWantedCardsRowActions.ts). Right-click
// context menu on the table, not a dropdown column — same UX as wanted-cards' table.
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Associate } from '~/types'

export function useAssociatesRowActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { approveAssociates, rejectAssociates, restoreAssociates } = useAssociatesMutations()

  const editingAssociate = ref<Associate | null>(null)
  const editModalOpen = ref(false)
  function openEditModal(associate: Associate) {
    editingAssociate.value = associate
    editModalOpen.value = true
  }

  // Own modal, not part of the edit form (user request, 2026-08-27) — see
  // NumberModal.vue's own header comment for why.
  const editingNumberAssociate = ref<Associate | null>(null)
  const numberModalOpen = ref(false)
  function openNumberModal(associate: Associate) {
    editingNumberAssociate.value = associate
    numberModalOpen.value = true
  }

  // "Rinnova" opens TransactionsListAddModal preset to this associate (payload
  // decision, 2026-08-12: renewal is recorded as an Association Fee payment, not
  // a bare renewals-table insert) rather than mutating anything itself — the
  // modal's own submit is what calls useTransactionsMutations' createTransaction,
  // which in turn writes the pauperwave_associate_renewals row server-side.
  const renewingAssociate = ref<Associate | null>(null)
  const renewModalOpen = ref(false)
  function openRenewModal(associate: Associate) {
    renewingAssociate.value = associate
    renewModalOpen.value = true
  }

  // Same permission as ApproveModal.vue (management only, RLS-enforced) — a
  // non-admin sees the error in a toast instead of a silently-ignored update,
  // same pattern as useWantedCardsRowActions.ts's changeStatus.
  async function approve(associate: Associate) {
    try {
      await approveAssociates.mutateAsync([associate.id])
      toast.add({
        title: t('associate.approveModal.successToastTitle'),
        description: t('associate.approveModal.successToastDescription', 1),
        color: 'success'
      })
    } catch (err) {
      toast.add({
        title: t('associate.approveModal.errorToastTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // No confirm modal, unlike requests.vue's own bulk reject (10s undo toast)
  // — same directness as approve()/restore() in this file; a single-row
  // context-menu action was missing entirely until now (bug, user report
  // 2026-08-27), the bulk toolbar button was the only way to reject.
  async function reject(associate: Associate) {
    try {
      await rejectAssociates.mutateAsync([associate.id])
      toast.add({
        title: t('associate.rejectModal.successToastTitle'),
        description: t('associate.rejectModal.successToastDescription', 1),
        color: 'success'
      })
    } catch (err) {
      toast.add({
        title: t('associate.rejectModal.errorToastTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // Reverts a rejected request back to 'pending' — the counterpart to
  // useAssociatesMutations.ts's rejectAssociates, same permission/error
  // handling shape as approve() above.
  async function restore(associate: Associate) {
    try {
      await restoreAssociates.mutateAsync([associate.id])
      toast.add({
        title: t('associate.restoreModal.successToastTitle'),
        description: t('associate.restoreModal.successToastDescription', 1),
        color: 'success'
      })
    } catch (err) {
      toast.add({
        title: t('associate.restoreModal.errorToastTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  // Same clipboard pattern as useWantedCardsRowActions.ts's copyCardName —
  // reuses the generic common.copyErrorTitle for the failure toast since
  // there's nothing domain-specific to say there.
  async function copyToClipboard(text: string, successTitle: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: successTitle, color: 'success' })
    } catch (err) {
      toast.add({
        title: t('common.copyErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  function rowContextMenuItems(associate: Associate): DropdownMenuItem[] {
    return [
      // Edit first, renew/pay last (user request, 2026-08-19) — was the
      // reverse (edit at the bottom); approve/restore/copy stay in the
      // middle, unchanged.
      {
        label: t('associate.rowActions.edit'),
        icon: ICONS.edit,
        onSelect: () => openEditModal(associate)
      },
      // Only for approved associates — a pending/rejected request doesn't
      // have a tesseramento number to speak of yet.
      ...(associate.membership_request_status === 'approved'
        ? [{
          label: t('associate.rowActions.editNumber'),
          icon: ICONS.idCard,
          onSelect: () => openNumberModal(associate)
        }]
        : []),
      { type: 'separator' as const },
      // Only on the requests queue's pending rows — the roster never contains
      // pending associates, so this simply never shows there.
      ...(associate.membership_request_status === 'pending'
        ? [{
          label: t('associate.rowActions.approve'),
          icon: ICONS.confirm,
          color: 'success' as const,
          onSelect: () => approve(associate)
        }, {
          label: t('associate.rowActions.reject'),
          icon: ICONS.statusRejected,
          color: 'error' as const,
          onSelect: () => reject(associate)
        }, { type: 'separator' as const }]
        : []),
      // Only on rejected rows — undoes a reject that has already committed
      // (unlike the 10s undo-toast on the bulk action, this is for a
      // rejection from a previous session/page load).
      ...(associate.membership_request_status === 'rejected'
        ? [{
          label: t('associate.rowActions.restore'),
          icon: ICONS.undo,
          color: 'success' as const,
          onSelect: () => restore(associate)
        }, { type: 'separator' as const }]
        : []),
      {
        label: t('associate.rowActions.copyPhone'),
        icon: ICONS.phone,
        disabled: !associate.phone_number,
        onSelect: () => copyToClipboard(associate.phone_number!, t('associate.rowActions.phoneCopied'))
      },
      {
        label: t('associate.rowActions.copyEmail'),
        icon: ICONS.mail,
        disabled: !associate.email_address,
        onSelect: () => copyToClipboard(associate.email_address!, t('associate.rowActions.emailCopied'))
      },
      // Only when there's actually something to pay for: approved, and not
      // already paid up for the current year (membership_status 'active').
      // Same handler either way (both just record an Association Fee
      // payment) — only the label/icon change: "Rinnova" implies a lapsed
      // membership (to_renew/expired), which is wrong wording for 'unpaid'
      // (approved but never paid a single fee yet, see
      // MEMBERSHIP_STATUS_BADGE_CONFIG's own comment on that status).
      ...(associate.membership_request_status === 'approved' && associate.membership_status !== 'active'
        ? [{ type: 'separator' as const }, {
          label: associate.membership_status === 'unpaid'
            ? t('associate.rowActions.pay')
            : t('associate.rowActions.renew'),
          icon: associate.membership_status === 'unpaid' ? ICONS.receipt : ICONS.refresh,
          color: 'success' as const,
          onSelect: () => openRenewModal(associate)
        }]
        : [])
    ]
  }

  // Populated by UTable's `@contextmenu` on right-click over a row — the
  // UContextMenu wrapping the table has no way of knowing which row was clicked,
  // so it is set here and its `:items` recompute accordingly (same pattern as
  // useWantedCardsRowActions.ts).
  // shallowRef, not ref: Associate carries an optional Nuxt UI AvatarProps field
  // whose deeply generic/recursive type makes Vue's UnwrapRef<Associate> blow up
  // TS with "Type instantiation is excessively deep" (TS2589) — shallowRef skips
  // that recursive unwrap, which is fine here since this ref is only ever
  // replaced wholesale, never mutated through a nested property.
  const contextMenuRow = shallowRef<Associate | null>(null)
  function onRowContextmenu(_e: Event, row: { original: Associate }) {
    contextMenuRow.value = row.original
  }
  const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
    contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

  return {
    editingAssociate,
    editModalOpen,
    openEditModal,
    editingNumberAssociate,
    numberModalOpen,
    openNumberModal,
    renewingAssociate,
    renewModalOpen,
    openRenewModal,
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems
  }
}
