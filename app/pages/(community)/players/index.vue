<!-- app\pages\(community)\players\index.vue -->
<script lang="ts" setup>
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Same StatusFilterGroup used by associates/index.vue and wanted-cards/index.vue
// (a UFieldGroup of toggle buttons), not UTabs — this page has no real data
// source yet, so no per-status counts to pass, unlike those two.
const statusTabs = [
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

      <!-- Same #left toolbar placement as associates/index.vue and
           wanted-cards/index.vue for their StatusFilterGroup. -->
      <UDashboardToolbar>
        <template #left>
          <StatusFilterGroup v-model="activeStatusTab" :items="statusTabs" />
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
