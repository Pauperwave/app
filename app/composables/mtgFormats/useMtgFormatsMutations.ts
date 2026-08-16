// app\composables\mtgFormats\useMtgFormatsMutations.ts
import type { NewMtgFormatPayload } from '#shared/types/mtgFormats'

export function useMtgFormatsMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => queryCache.invalidateQueries({ key: MTG_FORMATS_KEY })

  const createFormat = useMutation({
    mutation: (format: NewMtgFormatPayload) =>
      $fetch('/api/mtg-formats/create', { method: 'POST', body: format }),
    onSettled: invalidate
  })

  const updateFormat = useMutation({
    mutation: ({ id, edits }: { id: number, edits: NewMtgFormatPayload }) =>
      $fetch(`/api/mtg-formats/${id}/update`, { method: 'POST', body: edits }),
    onSettled: invalidate
  })

  const deleteFormat = useMutation({
    mutation: (id: number) => $fetch(`/api/mtg-formats/${id}/delete`, { method: 'POST' }),
    onSettled: invalidate
  })

  return { createFormat, updateFormat, deleteFormat }
}
