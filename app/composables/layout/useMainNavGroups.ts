// app\composables\layout\useMainNavGroups.ts
// Pure nav-config data extracted from default.vue (not layout logic)
import type { NavigationMenuItem } from '@nuxt/ui'

// Nav-visibility gating (docs/architecture/roles.md steps 12/13, permission map in
// docs/architecture/permissions.md "Navigazione"): `permission` is stripped from every item before
// the final `satisfies NavigationMenuItem[][]`, so it never reaches UNavigationMenu. `children` is
// redefined (not just extended) so a nested item's `permission` is typed, not just allowed by
// NavigationMenuChildItem's index signature. UNavigationMenu already renders `children` as an
// accordion (expanded) or popover flyout (collapsed, `popover` set in default.vue).
type NavItem = Omit<NavigationMenuItem, 'children'> & {
  permission?: Permission
  children?: NavItem[]
}

// Each section is its own sub-array, not one flat array with inline labels: the spacing between
// groups (gap-1.5 on the UNavigationMenu root) stays visible when collapsed, unlike type:'label'
// items, which Nuxt UI drops from the DOM when collapsed. A static array, not computed:
// UNavigationMenu highlights the active entry by comparing `to` with the route, and no item depends
// on `route` for its own state.
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
    icon: ICONS.calendar,
    to: '/calendar',
    onSelect: () => {
      open.value = false
    }
  }, {
    // An overview page reads more like a dashboard than a report, so it sits under Calendario, not
    // in Statistiche
    label: t('statistic.overviewBreadcrumb'),
    icon: ICONS.chartColumn,
    to: '/statistics',
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
    label: t('transaction.breadcrumb'),
    icon: ICONS.wallet,
    to: '/transactions',
    permission: 'view-finance',
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
    label: t('associate.breadcrumb'),
    icon: ICONS.players,
    to: '/associates',
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
    label: t('wantedCard.breadcrumb'),
    icon: ICONS.cardSearch,
    to: '/wanted-cards',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('telegramBot.breadcrumb'),
    icon: ICONS.telegramBot,
    to: '/telegram-bot',
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
    // A ruleset isn't a standings page: it belongs with the other competition-setup items in this
    // section
    label: t('ruleset.breadcrumb'),
    icon: ICONS.rules,
    to: '/rulesets',
    permission: 'manage-rulesets',
    onSelect: () => {
      open.value = false
    }
  }], [{
    // A dropdown, not a flat label+list: four permanently expanded items took more vertical space
    // than any other section for pages used less often. No label item above it: the trigger already
    // reads "Classifiche"
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
    label: t('nav.commanderSection'),
    type: 'label'
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
    icon: ICONS.settingsGear,
    to: '/settings',
    // settings.vue is a real parent layout route for members/permissions/domains/notifications:
    // without `exact`, UNavigationMenu's active-matching follows the route record hierarchy and
    // this item stayed highlighted on every settings sub-page
    exact: true,
    permission: 'access-settings',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('settings.layout.links.profile'),
    icon: ICONS.player,
    to: '/settings/profile',
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

  // A group whose every non-label item was filtered out (e.g. "Impostazioni" for a plain player) is
  // dropped entirely, not left as a dangling header. `permission` isn't stripped from survivors:
  // UNavigationMenu never reads it and NavItem is assignable without a cast. Children get the same
  // filter (the top-level one never reaches inside `children`)
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
