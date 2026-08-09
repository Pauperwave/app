<!-- app\pages\(competitions)\events\[eventId]\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="event-tournament">
    <template #header>
      <UDashboardNavbar :title="$t('event.tournamentDetail.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      {{ $t('event.tournamentDetail.body') }}
    </template>
  </UDashboardPanel>
</template>
