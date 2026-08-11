<!-- app\pages\(competitions)\leagues\[leagueId]\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/tournaments/associates); these are
// still mock-data pages, expected to change dramatically once real functionality lands
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UDashboardPanel id="league-tournament">
    <template #header>
      <UDashboardNavbar :title="$t('league.tournamentDetail.navbarTitle')">
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
      {{ $t('league.tournamentDetail.body') }}
    </template>
  </UDashboardPanel>
</template>
