<!-- app\pages\(analytics)\statistics\commanders\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('commander.breadcrumb') })
</script>

<template>
  <UDashboardPanel id="commanders">
    <template #header>
      <UDashboardNavbar :title="$t('commander.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>
  </UDashboardPanel>
</template>
