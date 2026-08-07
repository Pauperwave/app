<!-- app\pages\(competitions)\leagues\[leagueId]\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="league-tournament">
    <template #header>
      <UDashboardNavbar :title="$t('league.tournamentDetail.navbarTitle')">
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
      {{ $t('league.tournamentDetail.body') }}
    </template>
  </UDashboardPanel>
</template>
