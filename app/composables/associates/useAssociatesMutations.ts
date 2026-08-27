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

  // Doesn't touch pauperwave_associates (see approve-renewal.post.ts), so it
  // invalidates PENDING_RENEWAL_REQUESTS_KEY instead of ASSOCIATES_KEY —
  // the "Richieste (di rinnovo)" tab's own membership_events-derived set,
  // not the roster's own cached rows (user request, 2026-08-27).
  const approveRenewals = useMutation({
    mutation: (ids: number[]) =>
      $fetch('/api/associates/approve-renewal', { method: 'POST', body: { ids } }),
    onSettled: () => queryCache.invalidateQueries({ key: PENDING_RENEWAL_REQUESTS_KEY })
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

  // Separate from updateAssociate — pauperwave_associate_number isn't part
  // of the shared application-form schema (user request, 2026-08-27; see
  // update-number.post.ts).
  const updateAssociateNumber = useMutation({
    mutation: ({ id, number }: { id: number, number: string | null }) =>
      $fetch(`/api/associates/${id}/update-number`, {
        method: 'POST',
        body: { pauperwave_associate_number: number }
      }),
    onSettled: invalidate
  })

  return {
    approveAssociates, rejectAssociates, restoreAssociates, updateAssociate,
    updateAssociateNumber, approveRenewals
  }
}
