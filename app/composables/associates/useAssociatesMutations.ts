// app\composables\associates\useAssociatesMutations.ts
// Pinia Colada mutation for the associates domain (ADR-007/ADR-009 pattern, see
// useWantedCardsMutations.ts): $fetch to the BFF endpoint, then invalidate the
// associates list so both /associates and /associates/requests (same query key)
// pick up the change without either page calling refresh() itself.
import type { AssociateEditsPayload } from '#shared/types/associates'

export function useAssociatesMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: ASSOCIATES_KEY })

  const approveAssociates = useMutation({
    mutation: (ids: number[]) =>
      $fetch('/api/associates/approve', { method: 'POST', body: { ids } }),
    onSettled: invalidate
  })

  const rejectAssociates = useMutation({
    mutation: (ids: number[]) =>
      $fetch('/api/associates/reject', { method: 'POST', body: { ids } }),
    onSettled: invalidate
  })

  const restoreAssociates = useMutation({
    mutation: (ids: number[]) =>
      $fetch('/api/associates/restore', { method: 'POST', body: { ids } }),
    onSettled: invalidate
  })

  const updateAssociate = useMutation({
    mutation: ({ id, edits }: { id: number, edits: AssociateEditsPayload }) =>
      $fetch(`/api/associates/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  return {
    approveAssociates, rejectAssociates, restoreAssociates, updateAssociate
  }
}
