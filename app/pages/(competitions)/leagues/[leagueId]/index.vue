<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()
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
          <UButton
            to="/leagues"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="xs"
          >
            {{ $t('common.back') }}
          </UButton>
        </template>

        <template #right>
          <UButton
            :to="`/leagues/${route.params.leagueId}/tournaments`"
            trailing-icon="i-lucide-chevron-right"
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
