// app\composables\locations\useLocationsRowActions.ts
// Edit-modal state for the "Modifica" button on the grid card and the table's "Azioni" column, the
// same minimal shape as useTournamentsRowActions.ts (locations has no bulk actions/delete:
// create+edit only)
import type { Location } from '~/types'

export function useLocationsRowActions() {
  const editingLocation = shallowRef<Location | null>(null)
  const editModalOpen = ref(false)

  function openEditModal(location: Location) {
    editingLocation.value = location
    editModalOpen.value = true
  }

  return { editingLocation, editModalOpen, openEditModal }
}
