<!-- app\pages\(community)\players\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const statusTabs: TabsItem[] = [
  { label: t('player.tabs.active'), value: 'active' },
  { label: t('player.tabs.inactive'), value: 'inactive' }
]

const activeStatusTab = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'active'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, status: value === 'active' ? undefined : value } })
  }
})
</script>

<template>
  <UDashboardPanel id="players">
    <template #header>
      <UDashboardNavbar :title="$t('player.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTabs
        v-model="activeStatusTab"
        :items="statusTabs"
        variant="link"
        class="w-full"
      />
    </template>
  </UDashboardPanel>
</template>
