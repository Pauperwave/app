<!-- app\layouts\default.vue -->
<script setup lang="ts">
import type { CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import { ICONS } from '~/utils/icons'

const route = useRoute()
const { t } = useI18n()
// const toast = useToast()

const open = ref(false)
// Named sidebarCollapsed, not collapsed: the sidebar's own #header/#default/
// #footer slots already destructure a scoped `collapsed` prop (see below),
// and shadowing it here trips vue/no-template-shadow.
const sidebarCollapsed = ref(false)

// Same official pattern as Nuxt UI's own "Control collapsed state" example on
// the DashboardSidebar docs page: own the collapsed state as a plain ref
// bound via v-model, then a shortcut just flips it — no need to inject Nuxt
// UI's own (undocumented, internal-only) useDashboard() util for this.
// <UDashboardSidebarCollapse>'s own button stays in sync automatically: it's
// a descendant reading the same context, which now mirrors this ref.
defineShortcuts({
  b: () => sidebarCollapsed.value = !sidebarCollapsed.value
})

// Shows a muted "g x" hint next to each nav item's label from the moment "g"
// is pressed until the next keystroke (whatever it is — the second key of
// the chord, or an unrelated key that just gives up on it) — no auto-hide
// timer. Reinforces the chords in NAV_SHORTCUTS for people who already know
// to press "g", not a first-time-discoverability affordance (that's what
// UDashboardSearch is for). No exposed "chord pending" state on
// defineShortcuts itself, so this is a small parallel keydown listener
// rather than a callback into it.
const showChordHints = ref(false)

// item.to is typed as string | RouteLocationRaw | undefined by NavigationMenuItem,
// and NAV_SHORTCUTS's index signature returns string | undefined under
// noUncheckedIndexedAccess — resolving both here keeps the template's v-for
// expression free of type-narrowing that Vue's compiler can't carry across it.
const navChordKeys = (to: NavigationMenuItem['to']): string[] => {
  if (typeof to !== 'string') return []
  return NAV_SHORTCUTS[to]?.split('-') ?? []
}

useEventListener('keydown', (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const usingInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
  if (usingInput || event.metaKey || event.ctrlKey || event.altKey) {
    return
  }

  showChordHints.value = event.key.toLowerCase() === 'g'
})

// Forces the "g" hint visible for the tour's "navigation" step instead of
// requiring the visitor to actually press "g" mid-tour — the whole point of
// that step is to show the hint, not just describe it. Reverts to the normal
// keydown-driven behavior (hidden) the moment the tour moves off that step.
const shortcutsTour = useShortcutsTour()
watch(() => shortcutsTour.current.value?.id, (id) => {
  showChordHints.value = id === 'navigation'
})

// Same 'associates' useAsyncData key as associates/index.vue — reuses that
// page's cached fetch instead of re-querying Supabase from the layout.
const { associates } = useAssociates()

// Feeds the "Associati" nav item's badge below (see #item-trailing) — same
// count backing the SubNav badge on /associates/richieste itself, so an admin
// sees "there's something to do" before ever opening the page.
const pendingAssociatesCount = computed(() => associates.value.filter(
  associate => associate.membership_request_status === 'pending'
).length)

// Each section is its own sub-array (not one flat array with inline labels): the
// spacing between groups (gap-1.5 on the UNavigationMenu root) stays visible even
// with the sidebar collapsed, because it is structural between groups — unlike
// type:'label' items, which Nuxt UI drops from the DOM entirely when collapsed is
// true (v-if, not merely hidden).
// Static array (not computed): UNavigationMenu highlights the active entry itself
// by comparing `to` with the current route, and no item here depends on `route`
// for its own state anymore.
const mainNavGroups = [[{
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
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('player.breadcrumb'),
  icon: ICONS.gameplay,
  to: '/players',
  devStatus: 'error',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('transaction.breadcrumb'),
  icon: ICONS.wallet,
  to: '/transactions',
  devStatus: 'error',
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
}], [{
  label: t('nav.commanderSection'),
  type: 'label'
}, {
  label: t('commander.breadcrumb'),
  icon: ICONS.crown,
  to: '/commanders',
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
  label: t('ruleset.breadcrumb'),
  icon: ICONS.rules,
  to: '/rulesets',
  devStatus: 'warning',
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
}], [{
  label: t('nav.settingsSection'),
  type: 'label'
}, {
  label: t('settings.layout.links.general'),
  icon: ICONS.player,
  to: '/settings',
  devStatus: 'error',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('settings.layout.links.members'),
  icon: ICONS.players,
  to: '/settings/members',
  devStatus: 'error',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('settings.layout.links.permissions'),
  icon: ICONS.permissions,
  to: '/settings/permissions',
  devStatus: 'warning',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('settings.layout.links.domains'),
  icon: ICONS.globe,
  to: '/settings/domains',
  devStatus: 'warning',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]

// `devStatus` still tags each nav item's build status (success = done,
// warning = in progress, error = stub or backed by mock data only) — kept as
// metadata on mainNavGroups (docs/PROGRESS.md ADR-007), just no longer
// rendered as a trailing UChip dot in the sidebar itself (removed
// 2026-08-11, was cluttering the nav rather than informing it).

// Opens Gmail's compose view directly instead of mailto:, which silently
// no-ops when the OS has no default mail client configured.
const gmailComposeLink = (subject: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=emanuelenardi.dev@gmail.com&su=${encodeURIComponent(subject)}`

const footerNavItems = [{
  label: t('nav.shortcutsTour.startButton'),
  icon: ICONS.keyboard,
  onSelect: () => shortcutsTour.start()
}, {
  label: t('nav.feedback'),
  icon: ICONS.messageCircle,
  to: gmailComposeLink(t('nav.feedbackSubject')),
  target: '_blank'
}, {
  label: t('nav.helpSupport'),
  icon: ICONS.info,
  to: gmailComposeLink(t('nav.helpSupportSubject')),
  target: '_blank'
}] satisfies NavigationMenuItem[]

// The CommandPalette/DashboardSearch doesn't support nested children arrays,it only shows flat lists.
// Each item in the items array should be a selectable command, not a group with children.
// Helper function to flatten nested navigation items for search
const flattenForSearch = (items: NavigationMenuItem[][]): CommandPaletteItem[] => {
  return items.flat().filter(item => item.type !== 'label' && !item.disabled).flatMap((item) => {
    // Parent item
    const parent: CommandPaletteItem = {
      label: item.label,
      icon: item.icon,
      to: item.to,
      badge: item.badge,
      onSelect: item.onSelect
    }

    // Children with parent context
    const children = (item.children || []).map(child => ({
      label: `${item.label} → ${child.label}`,
      icon: child.icon || item.icon,
      to: child.to,
      onSelect: child.onSelect
    }))

    return [parent, ...children]
  }) as CommandPaletteItem[]
}

const groups = computed(() => [{
  id: 'links',
  label: t('nav.search.goTo'),
  items: flattenForSearch([...mainNavGroups, footerNavItems])
}, {
  id: 'associates',
  label: t('nav.search.associates'),
  items: associates.value.map(associate => ({
    id: `associate-${associate.id}`,
    label: `${associate.first_name} ${associate.last_name}`,
    suffix: associate.email_address,
    icon: ICONS.players,
    to: `/associate/${slugify(`${associate.first_name} ${associate.last_name}`)}`,
    onSelect: () => {
      open.value = false
    }
  }))
}, {
  id: 'code',
  label: t('nav.search.code'),
  items: [{
    id: 'source',
    label: t('nav.search.viewSource'),
    icon: ICONS.github,
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
      class="bg-default"
      :ui="{
        root: 'lg:border-e-0',
        header: 'items-start pt-6',
        footer: 'pb-6'
      }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-0" />

        <!-- id anchors the shortcuts tour's "navigation" step (useShortcutsTour) -->
        <div id="tour-shortcuts-nav">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="mainNavGroups"
            orientation="vertical"
            tooltip
            popover
          >
            <template #item-trailing="{ item }">
              <div class="flex items-center gap-1">
                <template v-if="showChordHints">
                  <UKbd
                    v-for="key in navChordKeys(item.to)"
                    :key="key"
                    size="sm"
                    class="text-muted"
                  >
                    {{ key }}
                  </UKbd>
                </template>
                <!-- "Something needs action" count — pending tesseramento
                     requests waiting on /associates/richieste. -->
                <UBadge
                  v-if="item.to === '/associates' && pendingAssociatesCount > 0"
                  :label="pendingAssociatesCount"
                  color="warning"
                  variant="subtle"
                  size="sm"
                />
              </div>
            </template>
          </UNavigationMenu>
        </div>

        <div class="mt-auto flex" :class="collapsed ? 'justify-center' : 'justify-start px-2.5'">
          <LayoutVersionBadge :collapsed="collapsed" />
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerNavItems"
          orientation="vertical"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <!-- id anchors the shortcuts tour's "globalActions" step here since
             this is the sidebar footer, a reasonable general anchor for
             "these work anywhere" — n/b don't have dedicated UI in this
             exact spot, this is just a stable target near the bottom. -->
        <div id="tour-shortcuts-global" class="flex items-center gap-2 w-full" :class="collapsed ? 'flex-col' : ''">
          <UserMenu :collapsed="collapsed" class="flex-1" />
          <LayoutColorModeSwitch />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />

    <!-- #description overrides TourGuide's default plain-text paragraph: this
         tour's copy interpolates real UKbd chips (matching the sidebar hint)
         instead of quoted letters — the keypath/placeholder names come from
         useShortcutsTour.ts's step.description. Slots unused by a given
         step's keypath are simply ignored by <i18n-t>. -->
    <TourGuide :tour="shortcutsTour">
      <template #description="{ step }">
        <i18n-t
          v-if="step"
          :keypath="step.description"
          tag="p"
          scope="global"
          class="text-sm text-muted"
        >
          <template #g1>
            <UKbd size="sm">
              g
            </UKbd>
          </template>
          <template #g2>
            <UKbd size="sm">
              g
            </UKbd>
          </template>
          <template #g3>
            <UKbd size="sm">
              g
            </UKbd>
          </template>
          <template #a>
            <UKbd size="sm">
              a
            </UKbd>
          </template>
          <template #n>
            <UKbd size="sm">
              n
            </UKbd>
          </template>
          <template #b>
            <UKbd size="sm">
              b
            </UKbd>
          </template>
        </i18n-t>
      </template>
    </TourGuide>
  </UDashboardGroup>
</template>
