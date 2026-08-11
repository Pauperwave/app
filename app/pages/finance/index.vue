<!-- app\pages\finance\index.vue -->
<template>
  <UDashboardPanel id="finance">
    <template #header>
      <UDashboardNavbar :title="$t('nav.finance')">
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
