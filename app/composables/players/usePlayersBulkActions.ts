// app\composables\players\usePlayersBulkActions.ts
// Bulk delete over the selected players (useSelection.ts), with no undo window (like
// usePlayersRowActions.ts's confirmDelete: a player's tournament identity shouldn't be silently
// deleted seconds later). Fans the per-player mutation out with Promise.allSettled: players.uuid is
// ON DELETE RESTRICT from every tournament-history table, so a player who ever played surfaces as a
// per-item 409, not a blocked batch
import type { Player } from '~/types'
import type { Selection } from '~/composables/useSelection'

export function usePlayersBulkActions(selection: Selection<number>) {
  const { t } = useI18n()
  const toast = useToast()
  const { deletePlayer } = usePlayersMutations()

  const pendingDelete = shallowRef<Player[] | null>(null)
  const confirmOpen = ref(false)
  const deleting = ref(false)

  function requestDelete(players: Player[]) {
    if (!players.length) return
    pendingDelete.value = players
    confirmOpen.value = true
  }

  async function confirmDelete() {
    const players = pendingDelete.value
    if (!players?.length) return

    deleting.value = true
    try {
      const results = await Promise.allSettled(
        players.map(player => deletePlayer.mutateAsync(player.id))
      )
      const failed = results.filter(result => result.status === 'rejected').length
      const succeeded = results.length - failed

      confirmOpen.value = false
      pendingDelete.value = null
      selection.clear()

      toast.add({
        title: succeeded > 0
          ? t('player.bulkActions.deleteSuccessToast', succeeded)
          : t('player.rowActions.deleteErrorTitle'),
        description: failed > 0 ? t('player.bulkActions.partialFailure', failed) : undefined,
        color: failed > 0 ? (succeeded > 0 ? 'warning' : 'error') : 'success'
      })
    } finally {
      deleting.value = false
    }
  }

  return { pendingDelete, confirmOpen, deleting, requestDelete, confirmDelete }
}
