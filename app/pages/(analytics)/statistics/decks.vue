<!-- app\pages\(analytics)\statistics\decks.vue -->
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
