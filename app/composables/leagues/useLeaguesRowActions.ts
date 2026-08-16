// app\composables\leagues\useLeaguesRowActions.ts
// Edit-modal state for the visible "Modifica" button on the grid card and the
// table's "Azioni" column — same reasoning as useTournamentsRowActions.ts.
import type { League } from '~/types'

export function useLeaguesRowActions() {
  const editingLeague = shallowRef<League | null>(null)
  const editModalOpen = ref(false)

  function openEditModal(league: League) {
    editingLeague.value = league
    editModalOpen.value = true
  }

  return { editingLeague, editModalOpen, openEditModal }
}
