// app\composables\events\useEventsRowActions.ts
// Edit-modal state for the visible "Modifica" button on the grid card and the
// table's "Azioni" column — same reasoning as useLeaguesRowActions.ts.
import type { Event } from '~/types'

export function useEventsRowActions() {
  const editingEvent = shallowRef<Event | null>(null)
  const editModalOpen = ref(false)

  function openEditModal(event: Event) {
    editingEvent.value = event
    editModalOpen.value = true
  }

  return { editingEvent, editModalOpen, openEditModal }
}
