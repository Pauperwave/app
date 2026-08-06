<template>
  <UDashboardPanel id="players">
    <template #header>
      <UDashboardNavbar :title="$t('nav.players')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
  </UDashboardPanel>
</template>
