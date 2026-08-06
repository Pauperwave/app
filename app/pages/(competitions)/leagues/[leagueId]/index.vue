<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="league">
    <template #header>
      <UDashboardNavbar :title="$t('league.detail.navbarTitle')">
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
      {{ $t('league.detail.body.leaderboard') }}

      {{ $t('league.detail.body.participants') }}
    </template>
  </UDashboardPanel>
</template>
