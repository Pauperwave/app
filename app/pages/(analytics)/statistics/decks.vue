<!-- app\pages\(analytics)\statistics\decks.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('statistic.decksBreadcrumb') })
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar :title="$t('statistic.decksBreadcrumb')">
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
