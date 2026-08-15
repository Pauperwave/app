<!-- app\pages\(analytics)\statistics\commanders\index.vue -->
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
