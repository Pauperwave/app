<!-- app\pages\(competitions)\leagues\[leagueId]\tournaments\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/leagues/associates); these are
// still mock-data pages, expected to change dramatically once real functionality lands
const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UDashboardPanel id="league-tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')">
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
      {{ $t('league.tournamentsList.body') }}

      <!-- TODO: temporary, remove once the table with real data
           replaces this placeholder -->
      <UButton
        :to="`/leagues/${route.params.leagueId}/tournaments/1`"
        variant="outline"
        color="neutral"
        class="mt-4"
        :icon="ICONS.chevronRight"
      >
        {{ $t('common.dummyLinkLabel') }}
      </UButton>
    </template>
  </UDashboardPanel>
</template>
