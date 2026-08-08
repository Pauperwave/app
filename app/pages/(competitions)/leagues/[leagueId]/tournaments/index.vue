<!-- app\pages\(competitions)\leagues\[leagueId]\tournaments\index.vue -->
<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()
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

      <!-- TODO: temporaneo, da rimuovere quando la tabella con dati reali
           sostituirà questo placeholder -->
      <UButton
        :to="`/leagues/${route.params.leagueId}/tournaments/1`"
        variant="outline"
        color="neutral"
        class="mt-4"
        icon="i-lucide-chevron-right"
      >
        {{ $t('common.dummyLinkLabel') }}
      </UButton>
    </template>
  </UDashboardPanel>
</template>
