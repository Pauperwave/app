// test\unit\composables\transactions\useTransactionsRowActions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactionsRowActions } from '~/composables/transactions/useTransactionsRowActions'
import type { Transaction } from '~/types'

const deleteTransaction = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/transactions/useTransactionsMutations', () => ({
  useTransactionsMutations: () => ({ deleteTransaction })
}))

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return { id: 1, ...overrides } as Transaction
}

describe('useTransactionsRowActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    deleteTransaction.mutateAsync.mockReset()
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  })

  it('exposes edit and delete as the only two row actions', () => {
    const { rowContextMenuItems } = useTransactionsRowActions()
    const items = rowContextMenuItems(makeTransaction({}))
    const labels = items.map(item => ('label' in item ? item.label : '---'))
    expect(labels).toEqual(['transaction.rowActions.edit', '---', 'transaction.rowActions.delete'])
  })

  it('openDeleteConfirm sets the pending transaction and opens the confirm modal', () => {
    const {
      openDeleteConfirm, deletingTransaction, deleteConfirmOpen
    } = useTransactionsRowActions()
    const transaction = makeTransaction({ id: 5 })
    openDeleteConfirm(transaction)
    expect(deletingTransaction.value).toEqual(transaction)
    expect(deleteConfirmOpen.value).toBe(true)
  })

  it('confirmDelete closes the modal on success, toggling `deleting` around the call', async () => {
    deleteTransaction.mutateAsync.mockResolvedValue(undefined)
    const {
      openDeleteConfirm, confirmDelete, deleteConfirmOpen, deleting
    } = useTransactionsRowActions()
    openDeleteConfirm(makeTransaction({ id: 7 }))

    const promise = confirmDelete()
    expect(deleting.value).toBe(true)
    await promise

    expect(deleteTransaction.mutateAsync).toHaveBeenCalledWith(7)
    expect(deleteConfirmOpen.value).toBe(false)
    expect(deleting.value).toBe(false)
  })

  it('confirmDelete toasts an error and keeps the modal open on failure', async () => {
    deleteTransaction.mutateAsync.mockRejectedValue(new Error('boom'))
    const {
      openDeleteConfirm, confirmDelete, deleteConfirmOpen, deleting
    } = useTransactionsRowActions()
    openDeleteConfirm(makeTransaction({ id: 7 }))

    await confirmDelete()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(deleteConfirmOpen.value).toBe(true)
    expect(deleting.value).toBe(false)
  })

  it('confirmDelete does nothing when there is no pending transaction', async () => {
    const { confirmDelete } = useTransactionsRowActions()
    await confirmDelete()
    expect(deleteTransaction.mutateAsync).not.toHaveBeenCalled()
  })
})
