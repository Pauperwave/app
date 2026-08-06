<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="league-tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      {{ $t('league.tournamentsList.body') }}
    </template>
  </UDashboardPanel>
</template>
