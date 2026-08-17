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

// Same 'associates' Pinia Colada key as associates/index.vue — reuses that
// page's cached fetch instead of re-querying Supabase from the layout.
const { data: associates } = useAssociatesQuery()

// Feeds the "Associati" nav item's badge below (see #item-trailing) — same
// count backing the SubNav badge on /associates/requests itself, so an admin
// sees "there's something to do" before ever opening the page.
const pendingAssociatesCount = computed(() => (associates.value ?? []).filter(
  associate => associate.membership_request_status === 'pending'
).length)

const mainNavGroups = useMainNavGroups(open)

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

const handleLogout = useLogout()

// "New …" items reuse the same "?action=create" convention as
// HomeQuickCreateMenu.vue (associates/transactions) and the wanted-cards page
// (just wired up to it above) — landing on the list page with its Add modal
// already open, instead of a modal owned by the palette itself.
// Nested under a single "Create new" item's `children` array so the palette
// drills into a submenu (CommandPalette.vue's native `navigate`/back
// behavior) rather than listing every quick-create flat in the actions group.
const actionItems = computed<CommandPaletteItem[]>(() => [{
  id: 'create-new',
  label: t('nav.search.createNew'),
  icon: ICONS.add,
  children: [{
    id: 'create-associate',
    label: t('home.quickCreate.newAssociate'),
    icon: ICONS.addPlayer,
    to: '/associates/requests?action=create',
    onSelect: () => { open.value = false }
  }, {
    id: 'create-transaction',
    label: t('home.quickCreate.newTransaction'),
    icon: ICONS.coins,
    to: '/transactions?action=create',
    onSelect: () => { open.value = false }
  }, {
    id: 'create-wanted-card',
    label: t('wantedCard.breadcrumb'),
    icon: ICONS.cardSearch,
    to: '/wanted-cards?action=create',
    onSelect: () => { open.value = false }
  }]
}, {
  id: 'sign-out',
  label: t('userMenu.logout'),
  icon: ICONS.logout,
  onSelect: () => {
    open.value = false
    handleLogout()
  }
}])

const groups = computed(() => [{
  id: 'actions',
  label: t('nav.search.actions'),
  items: actionItems.value
}, {
  id: 'links',
  label: t('nav.search.goTo'),
  items: flattenForSearch([...mainNavGroups.value, footerNavItems])
}, {
  id: 'associates',
  label: t('nav.search.associates'),
  items: (associates.value ?? []).map(associate => ({
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
        <LayoutTeamsMenu :collapsed="collapsed" />
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
                     requests waiting on /associates/requests. -->
                <UBadge
                  v-if="item.to === '/associates/requests' && pendingAssociatesCount > 0"
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
          <LayoutUserMenu :collapsed="collapsed" class="flex-1" />
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
    <TourGuide :tour="shortcutsTour" :h-shortcut="false">
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
