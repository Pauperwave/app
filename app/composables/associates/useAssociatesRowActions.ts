// app\composables\associates\useAssociatesRowActions.ts
// Row actions (currently "Modifica") plus the edit-modal state they open, shared by
// associates/index.vue, requests.vue and associate/[slug].vue (each calling this fresh, like
// useWantedCardsRowActions.ts). A right-click context menu, as on wanted-cards
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

  // Own modal, not part of the edit form (see NumberModal.vue)
  const editingNumberAssociate = ref<Associate | null>(null)
  const numberModalOpen = ref(false)
  function openNumberModal(associate: Associate) {
    editingNumberAssociate.value = associate
    numberModalOpen.value = true
  }

  // "Rinnova" opens TransactionsListAddModal preset to this associate (renewal is recorded as an
  // Association Fee payment, not a bare renewals insert): the modal's submit calls
  // createTransaction, which writes the pauperwave_associate_renewals row server-side
  const renewingAssociate = ref<Associate | null>(null)
  const renewModalOpen = ref(false)
  function openRenewModal(associate: Associate) {
    renewingAssociate.value = associate
    renewModalOpen.value = true
  }

  // Same permission as ApproveModal.vue (management only, RLS-enforced): a non-admin gets an error
  // toast, like useWantedCardsRowActions.ts's changeStatus
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

  // No confirm modal, unlike requests.vue's bulk reject (10s undo toast): same directness as
  // approve()/restore()
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

  // Reverts a rejected request to 'pending', the counterpart to rejectAssociates (same
  // permission/error handling as approve())
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

  const { copyToClipboard } = useCopyToClipboard()

  function rowContextMenuItems(associate: Associate): DropdownMenuItem[] {
    return [
      // Edit first, renew/pay last; approve/restore/copy stay in the middle
      {
        label: t('associate.rowActions.edit'),
        icon: ICONS.edit,
        onSelect: () => openEditModal(associate)
      },
      // Only for approved associates: a pending/rejected request has no tesseramento number yet
      ...(associate.membership_request_status === 'approved'
        ? [{
          label: t('associate.rowActions.editNumber'),
          icon: ICONS.idCard,
          onSelect: () => openNumberModal(associate)
        }]
        : []),
      { type: 'separator' as const },
      // Only on the requests queue's pending rows (the roster never contains pending associates)
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
      // Only on rejected rows: undoes a rejection already committed (the bulk undo toast only
      // covers the last 10s)
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
      // Only when there's something to pay for: approved and not already paid for the current year
      // (membership_status 'active'). Same handler either way (an Association Fee payment); only
      // label/icon change: "Rinnova" implies a lapsed membership, wrong for 'unpaid' (approved,
      // never paid a fee, see MEMBERSHIP_STATUS_BADGE_CONFIG)
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

  const { onRowContextmenu, tableContextMenuItems } = useRowContextMenu(rowContextMenuItems)

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
