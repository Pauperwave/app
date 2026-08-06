<template>
  <UDashboardPanel id="players">
    <template #header>
      <UDashboardNavbar :title="$t('player.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
  </UDashboardPanel>
</template>
