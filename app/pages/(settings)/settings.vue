<!-- app\pages\(settings)\settings.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const route = useRoute()

// The domains and permissions tables are wider than the single-column forms
// every other settings page is comfortable with — widen just those pages
// instead of every subpage under /settings. Permissions has no cap at all: its
// feature column stays on one line rather than wrapping (see permissions.vue),
// so it needs whatever width that takes rather than a fixed breakpoint.
const wideBodyRoutes: Record<string, string> = {
  '/settings/domains': 'lg:max-w-4xl',
  '/settings/permissions': 'w-full'
}
const bodyMaxWidth = computed(() => wideBodyRoutes[route.path] ?? 'lg:max-w-2xl')

// Second, separate nav surface from useMainNavGroups.ts's sidebar — found
// 2026-08-17 to be completely unfiltered, letting an organizer reach
// /settings/members and /settings/domains just by clicking these tabs even
// with the sidebar link hidden. All four settings pages are admin+ now
// (access-settings), so this tabs bar only ever needs to omit itself
// entirely for anyone below that, not filter individual links.
const { can } = useUserRole()

const links = computed<NavigationMenuItem[][]>(() => can('access-settings')
  ? [[{
    label: t('settings.layout.links.general'),
    icon: ICONS.settingsGear,
    to: '/settings',
    exact: true
  }, {
    label: t('settings.layout.links.profile'),
    icon: ICONS.player,
    to: '/settings/profile'
  }, {
    label: t('settings.layout.links.members'),
    icon: ICONS.players,
    to: '/settings/members'
  }, {
    label: t('settings.layout.links.permissions'),
    icon: ICONS.permissions,
    to: '/settings/permissions'
  }, {
    label: t('settings.layout.links.domains'),
    icon: ICONS.globe,
    to: '/settings/domains'
  }]]
  : [])
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="$t('settings.layout.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class aligns with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full mx-auto" :class="bodyMaxWidth">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
