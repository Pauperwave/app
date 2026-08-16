// app\composables\locations\useLocationsMutations.ts
import type { NewLocationPayload } from '#shared/types/locations'

export function useLocationsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: LOCATIONS_KEY })

  const createLocation = useMutation({
    mutation: (location: NewLocationPayload) =>
      $fetch('/api/locations/create', { method: 'POST', body: location }),
    onSettled: invalidate
  })

  const updateLocation = useMutation({
    mutation: ({ id, edits }: { id: number, edits: NewLocationPayload }) =>
      $fetch(`/api/locations/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  return { createLocation, updateLocation }
}
