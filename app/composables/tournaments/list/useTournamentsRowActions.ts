// app\composables\tournaments\list\useTournamentsRowActions.ts
// Edit-modal state for the visible "Modifica" button on the grid card and the table's "Azioni"
// column: always-visible buttons, so a separate minimal composable rather than items in
// useCopyLinkContextMenu.ts's right-click menu
import type { Tournament } from '~/types'

export function useTournamentsRowActions() {
  const editingTournament = shallowRef<Tournament | null>(null)
  const editModalOpen = ref(false)

  function openEditModal(tournament: Tournament) {
    editingTournament.value = tournament
    editModalOpen.value = true
  }

  return { editingTournament, editModalOpen, openEditModal }
}
