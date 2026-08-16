<!-- app\pages\(competitions)\events\[eventId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (leagues/tournaments/associates); these are
// still mock-data pages, expected to change dramatically once real functionality lands
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UDashboardPanel id="event">
    <template #header>
      <UDashboardNavbar :title="$t('event.detail.navbarTitle')">
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
      {{ $t('event.detail.body.specificEvent') }}

      {{ $t('event.detail.body.eventDetails') }}

      {{ $t('event.detail.body.participantsList') }}

      {{ $t('event.detail.body.linkedTournaments') }}
    </template>
  </UDashboardPanel>
</template>
