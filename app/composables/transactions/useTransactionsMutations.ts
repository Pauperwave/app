// app\composables\transactions\useTransactionsMutations.ts
// Pinia Colada mutation for the transactions domain (ADR-007/ADR-009 pattern, see
// useWantedCardsMutations.ts). Invalidates both the transactions list and the
// associates one, since an "Association Fee" payment can flip an associate's
// derived membership_status via the renewal it writes
// (server/api/transactions/create.post.ts).
import type { NewTransactionPayload } from '#shared/types/transactions'

export function useTransactionsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => {
    queryCache.invalidateQueries({ key: TRANSACTIONS_KEY })
    queryCache.invalidateQueries({ key: ASSOCIATES_KEY })
  }

  const createTransaction = useMutation({
    mutation: (payload: NewTransactionPayload) =>
      $fetch('/api/transactions/create', { method: 'POST', body: payload }),
    onSettled: invalidate
  })

  const updateTransaction = useMutation({
    mutation: ({ id, edits }: { id: number, edits: NewTransactionPayload }) =>
      $fetch(`/api/transactions/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  const deleteTransaction = useMutation({
    mutation: (id: number) =>
      $fetch(`/api/transactions/${id}/delete`, { method: 'POST' }),
    onSettled: invalidate
  })

  return { createTransaction, updateTransaction, deleteTransaction }
}
