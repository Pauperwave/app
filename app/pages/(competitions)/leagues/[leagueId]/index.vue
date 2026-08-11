<!-- app\pages\(competitions)\leagues\[leagueId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/tournaments/associates); these are
// still mock-data pages, expected to change dramatically once real functionality lands
const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UDashboardPanel id="league">
    <template #header>
      <UDashboardNavbar :title="$t('league.detail.navbarTitle')">
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

        <template #right>
          <UButton
            :to="`/leagues/${route.params.leagueId}/tournaments`"
            :trailing-icon="ICONS.chevronRight"
            color="neutral"
            variant="ghost"
            size="xs"
          >
            {{ $t('common.forward') }}
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      {{ $t('league.detail.body.leaderboard') }}

      {{ $t('league.detail.body.participants') }}
    </template>
  </UDashboardPanel>
</template>
