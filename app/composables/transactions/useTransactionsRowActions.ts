// app\composables\transactions\useTransactionsRowActions.ts
// Row actions (currently just "Modifica") + the edit-modal state it opens —
// same shape as useAssociatesRowActions.ts/useWantedCardsRowActions.ts. Right-
// click context menu on the table, not a dropdown column.
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Transaction } from '~/types'

export function useTransactionsRowActions() {
  const { t } = useI18n()

  const editingTransaction = shallowRef<Transaction | null>(null)
  const editModalOpen = ref(false)
  function openEditModal(transaction: Transaction) {
    editingTransaction.value = transaction
    editModalOpen.value = true
  }

  function rowContextMenuItems(transaction: Transaction): DropdownMenuItem[] {
    return [{
      label: t('transaction.rowActions.edit'),
      icon: ICONS.edit,
      onSelect: () => openEditModal(transaction)
    }]
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
    rowContextMenuItems,
    onRowContextmenu,
    tableContextMenuItems
  }
}
