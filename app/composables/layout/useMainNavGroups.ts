// app\composables\layout\useMainNavGroups.ts
// Extracted out of default.vue (2026-08-16) — pure nav-config data, not
// layout logic, was the single largest chunk of that file (~220 lines).
import type { NavigationMenuItem } from '@nuxt/ui'

// Nav-visibility gating added 2026-08-17 (docs/architecture/roles.md's
// "Suggested order of work" steps 12/13, permission map decided in
// docs/architecture/permissions.md's "Navigazione" section). `permission`
// is stripped from every item before the final `satisfies
// NavigationMenuItem[][]` below, so it never reaches the actual
// UNavigationMenu component.
type NavItem = NavigationMenuItem & { permission?: Permission }

// Each section is its own sub-array (not one flat array with inline labels): the
// spacing between groups (gap-1.5 on the UNavigationMenu root) stays visible even
// with the sidebar collapsed, because it is structural between groups — unlike
// type:'label' items, which Nuxt UI drops from the DOM entirely when collapsed is
// true (v-if, not merely hidden).
// Static array (not computed): UNavigationMenu highlights the active entry itself
// by comparing `to` with the current route, and no item here depends on `route`
// for its own state anymore.
//
// `devStatus` still tags each nav item's build status (success = done,
// warning = in progress, error = stub or backed by mock data only) — kept as
// metadata (docs/PROGRESS.md ADR-007), just no longer rendered as a trailing
// UChip dot in the sidebar itself (removed 2026-08-11, was cluttering the nav
// rather than informing it).
export function useMainNavGroups(open: Ref<boolean>) {
  const { t } = useI18n()
  const { can } = useUserRole()

  const rawGroups: NavItem[][] = [[{
    label: t('nav.dashboardsSection'),
    type: 'label'
  }, {
    label: t('nav.dashboard'),
    icon: ICONS.home,
    to: '/',
    devStatus: 'success',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('nav.calendar'),
    icon: ICONS.calendarView,
    to: '/calendar',
    devStatus: 'error',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('nav.finance'),
    icon: ICONS.badgeEuro,
    to: '/finance',
    devStatus: 'error',
    permission: 'view-finance',
    onSelect: () => {
      open.value = false
    }
  }], [{
    label: t('nav.community'),
    type: 'label'
  }, {
    label: t('associate.breadcrumb'),
    icon: ICONS.players,
    to: '/associates',
    devStatus: 'success',
    permission: 'view-associates',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('associate.subNav.requestsShort'),
    icon: ICONS.inbox,
    to: '/associates/requests',
    devStatus: 'success',
    permission: 'view-associates',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('player.breadcrumb'),
    icon: ICONS.gameplay,
    to: '/players',
    devStatus: 'error',
    permission: 'view-players',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('transaction.breadcrumb'),
    icon: ICONS.wallet,
    to: '/transactions',
    devStatus: 'error',
    permission: 'view-finance',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('wantedCard.breadcrumb'),
    icon: ICONS.cardSearch,
    to: '/wanted-cards',
    devStatus: 'success',
    onSelect: () => {
      open.value = false
    }
  }], [{
    label: t('nav.competitions'),
    type: 'label'
  }, {
    label: t('tournament.breadcrumb'),
    icon: ICONS.battle,
    to: '/tournaments',
    devStatus: 'warning'
  }, {
    label: t('league.breadcrumb'),
    icon: ICONS.standings,
    to: '/leagues',
    devStatus: 'warning',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('event.breadcrumb'),
    icon: ICONS.calendar,
    to: '/events',
    devStatus: 'warning',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('location.breadcrumb'),
    icon: ICONS.mapPin,
    to: '/locations',
    devStatus: 'warning',
    permission: 'manage-locations',
    onSelect: () => {
      open.value = false
    }
  }], [{
    label: t('nav.standingsSection'),
    type: 'label'
  }, {
    label: t('cittadino.breadcrumb'),
    icon: ICONS.medal,
    to: '/standings/cittadino',
    devStatus: 'warning',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('standings.commanderBreadcrumb'),
    icon: ICONS.medal,
    to: '/standings/commander',
    devStatus: 'warning',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('standings.premodernBreadcrumb'),
    icon: ICONS.medal,
    to: '/standings/premodern',
    devStatus: 'warning',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('standings.pauperBreadcrumb'),
    icon: ICONS.medal,
    to: '/standings/pauper',
    devStatus: 'warning',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('ruleset.breadcrumb'),
    icon: ICONS.rules,
    to: '/rulesets',
    devStatus: 'warning',
    permission: 'manage-rulesets',
    onSelect: () => {
      open.value = false
    }
  }], [{
    label: t('nav.statisticsSection'),
    type: 'label'
  }, {
    label: t('statistic.overviewBreadcrumb'),
    icon: ICONS.chartPie,
    to: '/statistics',
    devStatus: 'error',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('statistic.decksBreadcrumb'),
    icon: ICONS.layers,
    to: '/statistics/decks',
    devStatus: 'error',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('commander.breadcrumb'),
    icon: ICONS.crown,
    to: '/statistics/commanders',
    devStatus: 'error',
    onSelect: () => {
      open.value = false
    }
  }], [{
    label: t('nav.settingsSection'),
    type: 'label'
  }, {
    label: t('settings.layout.links.general'),
    icon: ICONS.player,
    to: '/settings',
    // app/pages/(settings)/settings.vue is a real parent layout route for
    // members/permissions/domains/notifications (Nuxt nested-routing
    // convention: a file + same-named directory) — without `exact`,
    // UNavigationMenu's default active-matching follows the route record
    // hierarchy, so this item stayed highlighted on every settings sub-page.
    exact: true,
    devStatus: 'error',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.members'),
    icon: ICONS.players,
    to: '/settings/members',
    devStatus: 'error',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.permissions'),
    icon: ICONS.permissions,
    to: '/settings/permissions',
    devStatus: 'warning',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.domains'),
    icon: ICONS.globe,
    to: '/settings/domains',
    devStatus: 'warning',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }]]

  // A group whose every non-label item got filtered out (e.g. the whole
  // "Impostazioni" section for a plain player) is dropped entirely, rather
  // than showing a dangling section header with nothing underneath.
  // `permission` isn't stripped from the surviving items — it's an extra
  // property UNavigationMenu itself never reads, and NavItem's structural
  // superset of NavigationMenuItem is assignable without a cast here.
  const mainNavGroups = computed<NavigationMenuItem[][]>(() => rawGroups
    .map(group => group.filter(item => !item.permission || can(item.permission)))
    .filter(group => group.some(item => item.type !== 'label')))

  return mainNavGroups
}
