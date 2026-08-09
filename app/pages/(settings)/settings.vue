<!-- app\pages\(settings)\settings.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const route = useRoute()

// The domains table has 4 columns (host, route, status, purpose) and doesn't fit
// the 2xl width every other settings page (single-column forms) is comfortable
// with — widen just that page instead of every subpage under /settings.
const bodyMaxWidth = computed(() => route.path === '/settings/domains' ? 'lg:max-w-4xl' : 'lg:max-w-2xl')

const links = computed<NavigationMenuItem[][]>(() => [[{
  label: t('settings.layout.links.general'),
  icon: 'i-lucide-user',
  to: '/settings',
  exact: true
}, {
  label: t('settings.layout.links.members'),
  icon: 'i-lucide-users',
  to: '/settings/members'
}, {
  label: t('settings.layout.links.notifications'),
  icon: 'i-lucide-bell',
  to: '/settings/notifications'
}, {
  label: t('settings.layout.links.security'),
  icon: 'i-lucide-shield',
  to: '/settings/security'
}, {
  label: t('settings.layout.links.domains'),
  icon: 'i-lucide-globe',
  to: '/settings/domains'
}], [{
  label: t('settings.layout.links.documentation'),
  icon: 'i-lucide-book-open',
  to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
  target: '_blank'
}]])
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
