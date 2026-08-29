// app\composables\tournaments\useTournamentCopyModal.ts
// Extracted out of tournaments/index.vue and leagues/[leagueId]/index.vue
// (2026-08-29) — both had this exact ref/function trio for the "Copia
// torneo" context-menu action, byte-identical, so it moved here rather than
// staying duplicated a third time once events/[eventId]/index.vue gets the
// same treatment.
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
