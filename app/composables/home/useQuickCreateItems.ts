// app\composables\home\useQuickCreateItems.ts
export interface QuickCreateItem {
  id: string
  label: string
  icon: string
  to: string
  // Matches useMainNavGroups.ts's own section order (Community before
  // Competitions) — home/QuickCreateMenu.vue uses this to render a divider
  // between domains instead of one flat list.
  group: 'community' | 'competitions'
}

// Single source for every "new X" quick-create shortcut: home/QuickCreateMenu.vue's dropdown and
// default.vue's Cmd+K palette both map it into their item shape, so adding/reordering/removing an
// entry updates both
export function useQuickCreateItems(): QuickCreateItem[] {
  const { t } = useI18n()

  return [{
    id: 'associate',
    label: t('home.quickCreate.newAssociate'),
    icon: ICONS.addPlayer,
    to: '/associates/requests?action=create',
    group: 'community'
  }, {
    id: 'transaction',
    label: t('home.quickCreate.newTransaction'),
    icon: ICONS.coins,
    to: '/transactions?action=create',
    group: 'community'
  }, {
    id: 'wanted-card',
    label: t('home.quickCreate.newWantedCard'),
    icon: ICONS.cardSearch,
    to: '/wanted-cards?action=create',
    group: 'community'
  }, {
    id: 'tournament',
    label: t('home.quickCreate.newTournament'),
    icon: ICONS.battle,
    to: '/tournaments?action=create',
    group: 'competitions'
  }, {
    id: 'league',
    label: t('home.quickCreate.newLeague'),
    icon: ICONS.standings,
    to: '/leagues?action=create',
    group: 'competitions'
  }, {
    id: 'event',
    label: t('home.quickCreate.newEvent'),
    icon: ICONS.calendarAdd,
    to: '/events?action=create',
    group: 'competitions'
  }, {
    id: 'location',
    label: t('home.quickCreate.newLocation'),
    icon: ICONS.mapPin,
    to: '/locations?action=create',
    group: 'competitions'
  }]
}
