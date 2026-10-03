// app\composables\layout\useNavBadgeCounts.ts
// The sidebar nav's trailing badge counts (10 Pinia Colada queries + the source table), a "pure
// data, not layout logic" split like useMainNavGroups.ts
import type { NavigationMenuItem } from '@nuxt/ui'

interface NavBadgeSource {
  to: string
  count: ComputedRef<number>
  color: 'warning' | 'neutral'
  // Most badges are an always-shown total; only the "needs action" ones (pending requests, lapsing
  // memberships, open wanted cards) hide at zero
  hideWhenZero?: boolean
}

export function useNavBadgeCounts() {
  // Feeds the "Associati"/"Richieste"/"Wanted Cards" badges: the same counts home/Staff.vue uses,
  // shared rather than duplicated
  const {
    pendingAssociatesCount, associatesCount, associatesToRenewCount, wantedCardsSearchingCount
  } = useHomeActionCounts()

  // Same Pinia Colada keys as each domain's index.vue
  // ('players'/'transactions'/'tournaments'/'leagues'/'events'/'locations'): plain totals, no extra
  // fetch
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

  // "Mazzi"/"Comandanti" read the same `commander_stats` list (same key, no extra fetch):
  // decksCount is one row per commander pair, commandersCount is every distinct commander name
  // across both slots (getAllCommanderNames, as in commanders/index.vue)
  const { data: commanderStats } = useAllCommanderStats()
  const decksCount = computed(() => (commanderStats.value ?? []).length)
  const commandersCount = computed(() => getAllCommanderNames(commanderStats.value ?? []).length)

  // One entry per nav-item badge (some items, like /associates, carry two: the roster count and a
  // warning count), replacing nine near-identical <UBadge v-if> blocks in default.vue
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
    { to: '/locations', count: locationsCount, color: 'neutral' },
    { to: '/statistics/decks', count: decksCount, color: 'neutral' },
    { to: '/statistics/commanders', count: commandersCount, color: 'neutral' }
  ]

  function navItemBadges(to: NavigationMenuItem['to']) {
    return sources
      .filter(source => source.to === to && (!source.hideWhenZero || source.count.value > 0))
      .map(source => ({ label: source.count.value, color: source.color }))
  }

  // Which nav items carry a warning badge when expanded: reused to show a warning UChip dot on the
  // icon when collapsed (the UBadge has nowhere to render)
  const navItemHasWarning = (to: NavigationMenuItem['to']) =>
    navItemBadges(to).some(badge => badge.color === 'warning')

  return { navItemBadges, navItemHasWarning }
}
