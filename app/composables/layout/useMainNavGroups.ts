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
// `children` redefined (not just extended) so a nested item's own
// `permission` is typed, not just structurally allowed via
// NavigationMenuChildItem's catch-all index signature — see the Classifiche
// group below (2026-08-23), the first nav item with children instead of a
// flat list. UNavigationMenu already turns `children` into an accordion
// (expanded sidebar) or a popover flyout (collapsed sidebar, `popover`
// prop already set in default.vue) with no extra wiring needed here.
type NavItem = Omit<NavigationMenuItem, 'children'> & {
  permission?: Permission
  children?: NavItem[]
}

// Each section is its own sub-array (not one flat array with inline labels): the
// spacing between groups (gap-1.5 on the UNavigationMenu root) stays visible even
// with the sidebar collapsed, because it is structural between groups — unlike
// type:'label' items, which Nuxt UI drops from the DOM entirely when collapsed is
// true (v-if, not merely hidden).
// Static array (not computed): UNavigationMenu highlights the active entry itself
// by comparing `to` with the current route, and no item here depends on `route`
// for its own state anymore.
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
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('nav.calendar'),
    icon: ICONS.calendarView,
    to: '/calendar',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('nav.finance'),
    icon: ICONS.badgeEuro,
    to: '/finance',
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
    permission: 'view-associates',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('associate.subNav.requestsShort'),
    icon: ICONS.inbox,
    to: '/associates/requests',
    permission: 'view-associates',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('player.breadcrumb'),
    icon: ICONS.gameplay,
    to: '/players',
    permission: 'view-players',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('transaction.breadcrumb'),
    icon: ICONS.wallet,
    to: '/transactions',
    permission: 'view-finance',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('wantedCard.breadcrumb'),
    icon: ICONS.cardSearch,
    to: '/wanted-cards',
    onSelect: () => {
      open.value = false
    }
  }], [{
    label: t('nav.competitions'),
    type: 'label'
  }, {
    label: t('tournament.breadcrumb'),
    icon: ICONS.battle,
    to: '/tournaments'
  }, {
    label: t('league.breadcrumb'),
    icon: ICONS.standings,
    to: '/leagues',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('event.breadcrumb'),
    icon: ICONS.calendar,
    to: '/events',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('location.breadcrumb'),
    icon: ICONS.mapPin,
    to: '/locations',
    permission: 'manage-locations',
    onSelect: () => {
      open.value = false
    }
  }, {
    // Moved out of Classifiche (2026-08-23, same request as the dropdown
    // change below) — a ruleset isn't a standings page, it belongs with the
    // other competition-setup items in this section.
    label: t('ruleset.breadcrumb'),
    icon: ICONS.rules,
    to: '/rulesets',
    permission: 'manage-rulesets',
    onSelect: () => {
      open.value = false
    }
  }], [{
    // Dropdown, not a flat label+list (user request, 2026-08-23) — four
    // items permanently expanded took more vertical space than any other
    // section for a set of pages used less often than tournaments/events.
    // No standalone label item needed above it: the trigger's own label
    // already reads "Classifiche", a separate header would be redundant.
    label: t('nav.standingsSection'),
    icon: ICONS.medal,
    children: [{
      label: t('cittadino.breadcrumb'),
      icon: ICONS.medal,
      to: '/standings/cittadino',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: t('standings.commanderBreadcrumb'),
      icon: ICONS.medal,
      to: '/standings/commander',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: t('standings.premodernBreadcrumb'),
      icon: ICONS.medal,
      to: '/standings/premodern',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: t('standings.pauperBreadcrumb'),
      icon: ICONS.medal,
      to: '/standings/pauper',
      onSelect: () => {
        open.value = false
      }
    }]
  }], [{
    label: t('nav.statisticsSection'),
    type: 'label'
  }, {
    label: t('statistic.overviewBreadcrumb'),
    icon: ICONS.chartPie,
    to: '/statistics',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('statistic.decksBreadcrumb'),
    icon: ICONS.layers,
    to: '/statistics/decks',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('commander.breadcrumb'),
    icon: ICONS.commander,
    to: '/statistics/commanders',
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
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.members'),
    icon: ICONS.players,
    to: '/settings/members',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.permissions'),
    icon: ICONS.permissions,
    to: '/settings/permissions',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.domains'),
    icon: ICONS.globe,
    to: '/settings/domains',
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('trash.breadcrumb'),
    icon: ICONS.delete,
    to: '/trash',
    permission: 'view-trash',
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
  // Children get the same permission filter as top-level items (2026-08-23,
  // Classifiche's own Regolamenti child) — the top-level filter alone never
  // reaches inside a `children` array.
  const mainNavGroups = computed<NavigationMenuItem[][]>(() => rawGroups
    .map(group => group
      .filter(item => !item.permission || can(item.permission))
      .map(item => (item.children
        ? {
          ...item,
          children: item.children.filter(child => !child.permission || can(child.permission))
        }
        : item)))
    .filter(group => group.some(item => item.type !== 'label')))

  return mainNavGroups
}
