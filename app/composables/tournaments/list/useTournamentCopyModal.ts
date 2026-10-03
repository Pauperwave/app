// app\composables\tournaments\list\useTournamentCopyModal.ts
// Shared by tournaments/index.vue and leagues/[leagueId]/index.vue: the ref/function trio of the
// "Copia torneo" context-menu action (events/[eventId]/index.vue will use it too)
import type { Tournament } from '~/types'

export function useTournamentCopyModal() {
  const copyModalOpen = ref(false)
  const copySourceTournament = shallowRef<Tournament | null>(null)
  function openCopyModal(tournament: Tournament) {
    copySourceTournament.value = tournament
    copyModalOpen.value = true
  }

  return { copyModalOpen, copySourceTournament, openCopyModal }
}
