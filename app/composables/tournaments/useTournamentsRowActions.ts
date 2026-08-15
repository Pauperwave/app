// app\composables\tournaments\useTournamentsRowActions.ts
// Edit-modal state for the visible "Modifica" button on the grid card and the
// table's "Azioni" column — unlike useCopyLinkContextMenu.ts's right-click
// menu, these are always-visible buttons, so this stays a separate, minimal
// composable rather than folding edit into that one's dropdown items.
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
