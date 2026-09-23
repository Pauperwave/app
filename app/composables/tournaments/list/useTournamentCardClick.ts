// app\composables\tournaments\list\useTournamentCardClick.ts
// Which statuses read as muted/cancelled/external, and the ctrl/cmd/shift-
// click-anywhere-selects-or-navigates behavior — shared by Card.vue/
// DenseCard.vue, which independently duplicated this exact logic
// (fallow:dupes, 2026-09-23). Getters (not plain values) for tournament/
// range since both can change after this composable's own setup call, same
// convention as the rest of the tournaments composables.
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
  // External (shop-organized) tournaments have no acceptance/rounds/awards
  // flow — the detail page has nothing meaningful to show for them, so the
  // card isn't a link (user request, 2026-09-07).
  const isExternal = computed(() => options.tournament()?.status === 'external')

  // Ctrl/Cmd+click or shift+click anywhere on the card toggles/range-selects
  // instead of navigating — same modifier convention as a file manager, lets
  // a visitor select without having to land precisely on the (small,
  // hover-revealed) checkbox. No-ops while loading/without a real tournament
  // — nothing to click through to yet.
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
