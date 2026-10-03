// test\unit\composables\transactions\useTransactionsRowActions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactionsRowActions } from '~/composables/transactions/useTransactionsRowActions'
import type { Transaction } from '~/types'

const deleteTransaction = { mutateAsync: vi.fn() }
const toastAdd = vi.fn()
const can = vi.hoisted(() => vi.fn())

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/transactions/useTransactionsMutations', () => ({
  useTransactionsMutations: () => ({ deleteTransaction })
}))
// Auto-imported by the composable, so mocked as a module rather than stubbed as a global
vi.mock('~/composables/useUserRole', () => ({ useUserRole: () => ({ can }) }))

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return { id: 1, ...overrides } as Transaction
}

describe('useTransactionsRowActions', () => {
  beforeEach(() => {
    toastAdd.mockClear()
    deleteTransaction.mutateAsync.mockReset()
    can.mockReset().mockReturnValue(true)
    vi.stubGlobal('useToast', () => ({ add: toastAdd }))
  })

  it('exposes edit and delete as the only two row actions', () => {
    const { rowContextMenuItems } = useTransactionsRowActions()
    const items = rowContextMenuItems(makeTransaction({}))
    const labels = items.map(item => ('label' in item ? item.label : '---'))
    expect(labels).toEqual(['transaction.rowActions.edit', '---', 'transaction.rowActions.delete'])
  })

  it('locks edit and delete of a membership-fee payment for anyone below admin', () => {
    can.mockReturnValue(false)
    const { rowContextMenuItems } = useTransactionsRowActions()

    const items = rowContextMenuItems(makeTransaction({ payment_type: 'Association Fee' }))

    const actions = items.filter(item => item.type !== 'separator')
    expect(actions.map(item => item.disabled)).toEqual([true, true])
    expect(can).toHaveBeenCalledWith('manage-membership-fees')
  })

  it('leaves a membership-fee payment actionable for an admin', () => {
    const { rowContextMenuItems } = useTransactionsRowActions()

    const items = rowContextMenuItems(makeTransaction({ payment_type: 'Association Fee' }))

    expect(items.filter(item => item.type !== 'separator').map(item => item.disabled))
      .toEqual([false, false])
  })

  it('never locks a payment of another type', () => {
    can.mockReturnValue(false)
    const { rowContextMenuItems } = useTransactionsRowActions()

    const items = rowContextMenuItems(makeTransaction({ payment_type: 'Donation' }))

    expect(items.filter(item => item.type !== 'separator').map(item => item.disabled))
      .toEqual([false, false])
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
