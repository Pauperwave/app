<!-- app\layouts\default.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { ICONS } from '~/utils/icons'

const { t } = useI18n()

const open = ref(false)
// Named sidebarCollapsed, not collapsed: the sidebar slots already destructure a scoped `collapsed`
// (vue/no-template-shadow)
const sidebarCollapsed = ref(false)

// Nuxt UI's documented "Control collapsed state" pattern: own the state as a ref bound via v-model
// and let the shortcut flip it (no internal useDashboard()); <UDashboardSidebarCollapse> stays in
// sync automatically
defineShortcuts({
  b: () => sidebarCollapsed.value = !sidebarCollapsed.value
})

// Shows a muted "g x" hint next to each nav item from the moment "g" is pressed until the next
// keystroke (no timer), reinforcing NAV_SHORTCUTS for people who already know "g". defineShortcuts
// exposes no "chord pending" state, so this uses the shared listener of useChordHintKey.ts (like
// RoundTimer.vue's "f" hint)
const showChordHints = useChordHintKey('g')

// item.to is typed string | RouteLocationRaw | undefined and NAV_SHORTCUTS's index signature
// returns string | undefined (noUncheckedIndexedAccess): resolving both here keeps the template's
// v-for free of narrowing
const navChordKeys = (to: NavigationMenuItem['to']): string[] => {
  if (typeof to !== 'string') return []
  return NAV_SHORTCUTS[to]?.split('-') ?? []
}

// Forces the "g" hint visible for the tour's "navigation" step instead of requiring a real
// keypress; reverts to the keydown-driven behavior when the tour moves on
const shortcutsTour = useShortcutsTour()
watch(() => shortcutsTour.current.value?.id, (id) => {
  showChordHints.value = id === 'navigation'
})

const { navItemBadges, navItemHasWarning } = useNavBadgeCounts()

// One app-wide channel: Telegram status icons update as soon as the bot links someone.
useAssociateTelegramLinksRealtime()

const mainNavGroups = useMainNavGroups(open)

// Opens Gmail's compose view directly: mailto: silently no-ops without a default mail client
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
        <!-- Developer toggle next to the org selector (same "flex-1 sibling" pattern as the
             footer's LayoutUserMenu). The sidebar's `header` ui override is items-start, which
             left-pinned the stacked buttons when collapsed: see the `header` key above. -->
        <div class="flex items-center gap-1 w-full" :class="collapsed ? 'flex-col' : ''">
          <LayoutTeamsMenu :collapsed="collapsed" class="flex-1 min-w-0" />
          <LayoutDeveloperViewToggle />
        </div>
      </template>

      <template #default="{ collapsed }">
        <!-- text-muted matches the nav items' muted icon color (UButton's ghost reads
             full-strength). tooltip: same collapsed-sidebar tooltip as every UNavigationMenu item.
             label="Search": the default "Search..." is too noisy as a plain tooltip. -->
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
              <!-- Collapsed sidebar has no room for the trailing UBadge, so a warning UChip dot on
                   the icon stands in. size="sm" matches Nuxt UI's built-in `item.chip` default.
                   !mr-0: linkLeadingIcon's mr-2 widens the chip's box and floats the dot past the
                   icon's corner; the label is hidden here anyway. -->
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
                <!-- Nuxt UI's fallback trailing content (chevron for items with children), lost by
                     this slot -->
                <UIcon
                  v-if="item.children?.length"
                  :name="ICONS.chevronDown"
                  :class="trailingUi.linkTrailingIcon({ active })"
                />
                <ChordHint v-if="showChordHints" :keys="navChordKeys(item.to)" />
                <!-- Badges are hidden while the "g" hint shows (both crowd the trailing area) -->
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

        <!-- Negative margin on the nav menu pulls the version badge closer to "Scorciatoie da
             tastiera": a `:ui` override wouldn't reliably cancel the differently-scoped default
             class (see CLAUDE.md) -->
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
        <!-- id anchors the shortcuts tour's "globalActions" step: a stable target for "works
             anywhere" -->
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

    <!-- #description overrides TourGuide's plain-text paragraph so the copy can interpolate
         UKbd chips (keypath/placeholders come from useShortcutsTour.ts's step.description);
         unused slots are ignored by <i18n-t> -->
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
