<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="event">
    <template #header>
      <UDashboardNavbar :title="$t('event.detail.navbarTitle')">
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
      {{ $t('event.detail.body.specificEvent') }}

      {{ $t('event.detail.body.eventDetails') }}

      {{ $t('event.detail.body.participantsList') }}

      {{ $t('event.detail.body.linkedTournaments') }}
    </template>
  </UDashboardPanel>
</template>
