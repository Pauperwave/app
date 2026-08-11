<!-- app\pages\calendar\index.vue -->
<template>
  <UDashboardPanel id="calendar">
    <template #header>
      <UDashboardNavbar :title="$t('nav.calendar')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="text-center py-12 text-muted">
        {{ $t('common.pageInDevelopment') }}
      </div>
    </template>
  </UDashboardPanel>
</template>
