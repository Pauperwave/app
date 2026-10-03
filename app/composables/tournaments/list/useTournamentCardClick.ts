// app\composables\tournaments\list\useTournamentCardClick.ts
// Which statuses read as muted/cancelled/external, plus the
// ctrl/cmd/shift-click-anywhere-selects-or-navigates behavior, shared by Card.vue/DenseCard.vue.
// Getters (not plain values) for tournament/range since both can change after setup, like the other
// tournaments composables
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

export function useTournamentCardClick(options: {
  tournament: () => Tournament | null | undefined
  range: () => number[]
  selection?: Selection<number>
}) {
  const isMuted = computed(() => {
    const tournament = options.tournament()
    return !!tournament && (tournament.status === 'completed' || tournament.status === 'cancelled')
  })
  const isCancelled = computed(() => options.tournament()?.status === 'cancelled')
  // External (shop-organized) tournaments have no acceptance/rounds/awards flow, so there is
  // nothing to show on the detail page: the card isn't a link
  const isExternal = computed(() => options.tournament()?.status === 'external')

  // Ctrl/Cmd+click or shift+click anywhere on the card toggles/range-selects instead of navigating
  // (like a file manager), so a visitor needn't hit the small hover-revealed checkbox. No-ops while
  // loading or without a real tournament
  function onCardClick(event: MouseEvent) {
    const tournament = options.tournament()
    if (!tournament) return
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      options.selection?.toggle(tournament.id, { shiftKey: event.shiftKey, range: options.range() })
      return
    }
    if (isExternal.value) return
    navigateTo(tournamentDetailUrl(tournament))
  }

  return { isMuted, isCancelled, isExternal, onCardClick }
}
