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
  const { approveAssociates } = useAssociatesMutations()

  const editingAssociate = ref<Associate | null>(null)
  const editModalOpen = ref(false)
  function openEditModal(associate: Associate) {
    editingAssociate.value = associate
    editModalOpen.value = true
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

  function rowContextMenuItems(associate: Associate): DropdownMenuItem[] {
    return [
      // Only on the requests queue's pending rows — the roster never contains
      // pending associates, so this simply never shows there.
      ...(associate.membership_request_status === 'pending'
        ? [{
          label: t('associate.rowActions.approve'),
          icon: ICONS.confirm,
          color: 'success' as const,
          onSelect: () => approve(associate)
        }, { type: 'separator' as const }]
        : []),
      // Only when there's actually something to renew: approved, and not already
      // paid up for the current year (membership_status 'active').
      ...(associate.membership_request_status === 'approved' && associate.membership_status !== 'active'
        ? [{
          label: t('associate.rowActions.renew'),
          icon: ICONS.refresh,
          color: 'success' as const,
          onSelect: () => openRenewModal(associate)
        }, { type: 'separator' as const }]
        : []),
      {
        label: t('associate.rowActions.edit'),
        icon: ICONS.edit,
        onSelect: () => openEditModal(associate)
      }
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
    renewingAssociate,
    renewModalOpen,
    openRenewModal,
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems
  }
}
