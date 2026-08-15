// app\composables\events\useEventsMutations.ts
import type { NewEventPayload } from '#shared/types/events'

export function useEventsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: EVENTS_KEY })

  // Same "every write goes through a server/api endpoint" convention as
  // useTournamentsMutations.ts — the BFF endpoint (requireManagementPermission)
  // is the authorization boundary, not RLS evaluated from the client.
  const createEvent = useMutation({
    mutation: (event: NewEventPayload) =>
      $fetch('/api/events/create', { method: 'POST', body: event }),
    onSettled: invalidate
  })

  return { createEvent }
}
