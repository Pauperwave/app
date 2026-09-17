<!-- app\layouts\default.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { ICONS } from '~/utils/icons'

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

const { navItemBadges, navItemHasWarning } = useNavBadgeCounts()

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

const groups = useCommandPaletteGroups({ open, mainNavGroups, footerNavItems })
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
        header: sidebarCollapsed ? 'items-center pt-6' : 'items-start pt-6',
        body: sidebarCollapsed ? 'sidebar-no-scrollbar' : '',
        footer: 'pb-6'
      }"
    >
      <template #header="{ collapsed }">
        <!-- Developer toggle lives next to the org selector (user request,
             2026-09-18, after the sidebar footer's UserMenu/ColorModeSwitch
             row ran out of room) — same "flex-1 sibling" pattern the footer
             row already uses for LayoutUserMenu. The sidebar's own `header`
             ui override is items-start (for the expanded org-selector row),
             but that left-pinned the stacked buttons when collapsed instead
             of centering them like the footer's items-center default — see
             the sidebarCollapsed-conditioned `header` key above. -->
        <div class="flex items-center gap-1 w-full" :class="collapsed ? 'flex-col' : ''">
          <LayoutTeamsMenu :collapsed="collapsed" class="flex-1 min-w-0" />
          <LayoutDeveloperViewToggle />
        </div>
      </template>

      <template #default="{ collapsed }">
        <!-- text-muted (user request, 2026-08-19): matched the nav items'
             own muted icon color, which this didn't by default (UButton's
             neutral/ghost coloring reads as full-strength, not muted).
             tooltip: same collapsed-sidebar tooltip every UNavigationMenu
             item already gets (via `tooltip popover` below) — wasn't passed
             here at all, so this button silently had none.
             label="Search" (user request, 2026-08-19): the component's own
             default label/tooltip text is "Search..." (meant for the full
             button with a kbd hint) — too noisy as a plain tooltip. -->
        <UDashboardSearchButton
          :collapsed="collapsed"
          label="Search"
          tooltip
          class="bg-transparent ring-0 text-muted"
        />

        <!-- id anchors the shortcuts tour's "navigation" step (useShortcutsTour) -->
        <div id="tour-shortcuts-nav">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="mainNavGroups"
            orientation="vertical"
            tooltip
            popover
          >
            <template #item-leading="{ item, active, ui: itemUi }">
              <!-- Collapsed sidebar has no room for the trailing UBadge below,
                   so a warning UChip dot on the icon itself stands in for it.
                   size="sm" matches Nuxt UI's own built-in `item.chip` leading
                   -icon-chip default (NavigationMenu.vue's linkLeadingChipSize
                   theme key) — the bell's standalone UChip defaults to "md"
                   because it's a different component context, not because
                   "sm" here was wrong (reverted after briefly dropping it,
                   2026-08-19).
                   !mr-0: linkLeadingIcon's default mr-2 (spacing before the
                   label) widens the chip's own bounding box, so its inset
                   dot — positioned right-0 against that wider box — floats
                   past the icon's actual corner instead of sitting flush on
                   it like the bell's chip does. The label is hidden in this
                   collapsed-only branch anyway, so the margin has no layout
                   job left to do here (confirmed visually via claude-in
                   -chrome, 2026-08-19). -->
              <UChip
                v-if="collapsed && navItemHasWarning(item.to)"
                color="warning"
                size="sm"
                inset
              >
                <UIcon
                  v-if="item.icon"
                  :name="item.icon"
                  :class="[itemUi.linkLeadingIcon({ active, disabled: !!item.disabled }), 'mr-0!']"
                />
              </UChip>
              <UIcon
                v-else-if="item.icon"
                :name="item.icon"
                :class="itemUi.linkLeadingIcon({ active, disabled: !!item.disabled })"
              />
            </template>

            <template #item-trailing="{ item, active, ui: trailingUi }">
              <div class="flex items-center gap-1">
                <!-- Nuxt UI's own fallback trailing content (chevron for an
                     item with children) — lost by overriding this slot for
                     the chord-hint/badge content below, so reproduced here
                     for Classifiche's own dropdown trigger (2026-08-23). -->
                <UIcon
                  v-if="item.children?.length"
                  :name="ICONS.chevronDown"
                  :class="trailingUi.linkTrailingIcon({ active })"
                />
                <ChordHint v-if="showChordHints" :keys="navChordKeys(item.to)" />
                <!-- Badges hidden while the "g" hint is showing (user
                     request, 2026-08-23) — both together crowded the same
                     trailing area, and the kbd hint is what "g" was pressed
                     to see. Driven by NAV_BADGE_SOURCES, not a per-route
                     v-if chain — see its own comment for why. -->
                <template v-else>
                  <UBadge
                    v-for="(badge, badgeIndex) in navItemBadges(item.to)"
                    :key="badgeIndex"
                    :label="badge.label"
                    :color="badge.color"
                    variant="subtle"
                    size="sm"
                  />
                </template>
              </div>
            </template>
          </UNavigationMenu>
        </div>

        <!-- Grouped together (user request, 2026-09-18: bring the version
             badge closer to "Scorciatoie da tastiera") — negative margin on
             the nav menu itself rather than guessing at its own internal
             `:ui` spacing key (see the Nuxt UI :ui-override gotcha in
             CLAUDE.md: an override doesn't reliably cancel a
             differently-scoped default class, so a margin from outside is
             the safer bet here). -->
        <div class="mt-auto flex" :class="collapsed ? 'justify-center' : 'justify-start px-2.5'">
          <LayoutVersionBadge :collapsed="collapsed" />
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerNavItems"
          orientation="vertical"
          tooltip
          class="-mt-2"
        />
      </template>

      <template #footer="{ collapsed }">
        <!-- id anchors the shortcuts tour's "globalActions" step here since
             this is the sidebar footer, a reasonable general anchor for
             "these work anywhere" — n/b don't have dedicated UI in this
             exact spot, this is just a stable target near the bottom. -->
        <div
          id="tour-shortcuts-global"
          class="flex items-center gap-2 w-full"
          :class="collapsed ? 'flex-col' : ''"
        >
          <LayoutUserMenu :collapsed="collapsed" class="flex-1" />
          <LayoutColorModeSwitch />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <RolePreviewBanner />

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
