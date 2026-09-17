// app\composables\layout\useNavBadgeCounts.ts
// Extracted out of default.vue (2026-09-18) — the sidebar nav's own trailing
// badge counts (10 Pinia Colada queries + the source table), same "pure
// data, not layout logic" split as useMainNavGroups.ts.
import type { NavigationMenuItem } from '@nuxt/ui'

interface NavBadgeSource {
  to: string
  count: ComputedRef<number>
  color: 'warning' | 'neutral'
  // Most badges are a plain always-shown total; only the "needs action"
  // ones (pending requests, lapsing memberships, open wanted cards) hide
  // themselves at zero instead of showing an empty "0".
  hideWhenZero?: boolean
}

export function useNavBadgeCounts() {
  // Feeds the "Associati"/"Richieste"/"Wanted Cards" nav badges — same
  // counts home/Staff.vue's dashboard sections use, shared via this
  // composable rather than duplicated (2026-08-19).
  const {
    pendingAssociatesCount, associatesCount, associatesToRenewCount, wantedCardsSearchingCount
  } = useHomeActionCounts()

  // Same 'players'/'transactions'/'tournaments'/'leagues'/'events'/
  // 'locations' Pinia Colada keys as each domain's own index.vue — plain
  // totals, no extra fetch. statistics/decks.vue and statistics/commanders/
  // index.vue have no query of their own yet (both still empty placeholder
  // pages), so those two nav items don't get a badge.
  const { data: players } = usePlayersQuery()
  const playersCount = computed(() => (players.value ?? []).length)

  const { data: transactions } = useTransactionsQuery()
  const transactionsCount = computed(() => (transactions.value ?? []).length)

  const { data: tournaments } = useTournamentsQuery()
  const tournamentsCount = computed(() => (tournaments.value ?? []).length)

  const { data: leagues } = useLeaguesQuery()
  const leaguesCount = computed(() => (leagues.value ?? []).length)

  const { data: events } = useEventsQuery()
  const eventsCount = computed(() => (events.value ?? []).length)

  const { data: locations } = useLocationsQuery()
  const locationsCount = computed(() => (locations.value ?? []).length)

  // One entry per nav-item badge (some items, like /associates, carry two at
  // once: the plain roster count and a separate warning count) — collapses
  // what used to be nine near-identical <UBadge v-if="item.to === '/x'">
  // blocks in default.vue's template into one v-for.
  const sources: NavBadgeSource[] = [
    { to: '/associates/requests', count: pendingAssociatesCount, color: 'warning', hideWhenZero: true },
    { to: '/associates', count: associatesCount, color: 'neutral' },
    { to: '/associates', count: associatesToRenewCount, color: 'warning', hideWhenZero: true },
    { to: '/wanted-cards', count: wantedCardsSearchingCount, color: 'neutral', hideWhenZero: true },
    { to: '/players', count: playersCount, color: 'neutral' },
    { to: '/transactions', count: transactionsCount, color: 'neutral' },
    { to: '/tournaments', count: tournamentsCount, color: 'neutral' },
    { to: '/leagues', count: leaguesCount, color: 'neutral' },
    { to: '/events', count: eventsCount, color: 'neutral' },
    { to: '/locations', count: locationsCount, color: 'neutral' }
  ]

  function navItemBadges(to: NavigationMenuItem['to']) {
    return sources
      .filter(source => source.to === to && (!source.hideWhenZero || source.count.value > 0))
      .map(source => ({ label: source.count.value, color: source.color }))
  }

  // Which nav items carry a warning-colored badge in the expanded sidebar —
  // reused to swap in a plain warning UChip dot on the icon when the sidebar
  // is collapsed (the trailing UBadge itself has nowhere to render).
  const navItemHasWarning = (to: NavigationMenuItem['to']) =>
    navItemBadges(to).some(badge => badge.color === 'warning')

  return { navItemBadges, navItemHasWarning }
}
