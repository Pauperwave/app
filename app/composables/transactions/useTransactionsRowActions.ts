// app\composables\transactions\useTransactionsRowActions.ts
// Row actions (currently just "Modifica") + the edit-modal state it opens —
// same shape as useAssociatesRowActions.ts/useWantedCardsRowActions.ts. Right-
// click context menu on the table, not a dropdown column.
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Transaction } from '~/types'

export function useTransactionsRowActions() {
  const { t } = useI18n()
  const toast = useToast()
  const { deleteTransaction } = useTransactionsMutations()

  const editingTransaction = shallowRef<Transaction | null>(null)
  const editModalOpen = ref(false)
  function openEditModal(transaction: Transaction) {
    editingTransaction.value = transaction
    editModalOpen.value = true
  }

  // No undo window here (unlike useWantedCardsRowActions.ts's confirmDelete) —
  // a payment is a financial record, not something to silently commit a few
  // seconds after the confirm click.
  const deletingTransaction = shallowRef<Transaction | null>(null)
  const deleteConfirmOpen = ref(false)
  const deleting = ref(false)
  function openDeleteConfirm(transaction: Transaction) {
    deletingTransaction.value = transaction
    deleteConfirmOpen.value = true
  }
  async function confirmDelete() {
    if (!deletingTransaction.value) return
    deleting.value = true
    try {
      await deleteTransaction.mutateAsync(deletingTransaction.value.id)
      deleteConfirmOpen.value = false
    } catch (err) {
      toast.add({
        title: t('transaction.rowActions.deleteErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    } finally {
      deleting.value = false
    }
  }

  function rowContextMenuItems(transaction: Transaction): DropdownMenuItem[] {
    return [
      {
        label: t('transaction.rowActions.edit'),
        icon: ICONS.edit,
        onSelect: () => openEditModal(transaction)
      },
      { type: 'separator' },
      {
        label: t('transaction.rowActions.delete'),
        icon: ICONS.delete,
        color: 'error',
        onSelect: () => openDeleteConfirm(transaction)
      }
    ]
  }

  const contextMenuRow = shallowRef<Transaction | null>(null)
  function onRowContextmenu(_e: Event, row: { original: Transaction }) {
    contextMenuRow.value = row.original
  }
  const tableContextMenuItems = computed<DropdownMenuItem[]>(() =>
    contextMenuRow.value ? rowContextMenuItems(contextMenuRow.value) : [])

  return {
    editingTransaction,
    editModalOpen,
    openEditModal,
    deletingTransaction,
    deleteConfirmOpen,
    deleting,
    openDeleteConfirm,
    confirmDelete,
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems
  }
}
