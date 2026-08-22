// app\composables\trash\useTrashMutations.ts
import type { TrashEntity } from '~/types'

// Restoring an item can affect any of the 6 domain list queries it came
// from, not just TRASH_KEY — fanned out across all of them here rather than
// each domain's own mutations file, since a single Trash page mixes several
// domains (same "BFF endpoint is the write, invalidate on settle" pattern
// as useEventsMutations.ts).
export function useTrashMutations() {
  const queryCache = useQueryCache()
  const invalidate = () => {
    queryCache.invalidateQueries({ key: TRASH_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENTS_KEY })
    queryCache.invalidateQueries({ key: LEAGUES_KEY })
    queryCache.invalidateQueries({ key: EVENTS_KEY })
    queryCache.invalidateQueries({ key: TRANSACTIONS_KEY })
    queryCache.invalidateQueries({ key: WANTED_CARDS_KEY })
    queryCache.invalidateQueries({ key: MTG_FORMATS_KEY })
  }

  const restoreItem = useMutation({
    mutation: ({ entity, id }: { entity: TrashEntity, id: number }) =>
      $fetch('/api/trash/restore', {
        method: 'POST',
        body: { table: TRASH_ENTITY_TABLES[entity], id }
      }),
    onSettled: invalidate
  })

  return { restoreItem }
}
