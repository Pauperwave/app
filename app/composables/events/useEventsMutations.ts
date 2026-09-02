// app\composables\events\useEventsMutations.ts
import type { EventStatus } from '~/types'
import type { NewEventPayload } from '#shared/types/events'

interface SetEventImageParams {
  id: number
  imageUrl: string | null
  imageCardName: string | null
  imageCardArtist: string | null
}

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

  const updateEvent = useMutation({
    mutation: ({ id, edits }: { id: number, edits: NewEventPayload }) =>
      $fetch(`/api/events/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  const setStatus = useMutation({
    mutation: ({ id, status }: { id: number, status: EventStatus }) =>
      $fetch(`/api/events/${id}/status`, { method: 'POST', body: { status } }),
    onSettled: invalidate
  })

  const setImage = useMutation({
    mutation: ({ id, ...body }: SetEventImageParams) =>
      $fetch(`/api/events/${id}/image`, { method: 'POST', body }),
    onSettled: invalidate
  })

  const deleteEvent = useMutation({
    mutation: (id: number) =>
      $fetch(`/api/events/${id}/delete`, { method: 'POST' }),
    onSettled: invalidate
  })

  return {
    createEvent, updateEvent, setStatus, setImage, deleteEvent
  }
}
