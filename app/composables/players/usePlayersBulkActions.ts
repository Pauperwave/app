// app\composables\players\usePlayersBulkActions.ts
// Bulk delete over a set of selected players (useSelection.ts). No undo
// window here — same reasoning as usePlayersRowActions.ts's own confirmDelete
// (a player's tournament identity isn't something to silently commit deleting
// a few seconds after the confirm click). Fans the existing per-player
// mutation out with Promise.allSettled: players.uuid is ON DELETE RESTRICT
// from every tournament-history table, so a player who's ever played surfaces
// as a per-item 409 here rather than blocking the whole batch.
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
