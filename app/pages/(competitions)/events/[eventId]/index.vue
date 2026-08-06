<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="event">
    <template #header>
      <UDashboardNavbar :title="$t('eventDetail.navbarTitle')">
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
      {{ $t('eventDetail.body.specificEvent') }}

      {{ $t('eventDetail.body.eventDetails') }}

      {{ $t('eventDetail.body.participantsList') }}

      {{ $t('eventDetail.body.linkedTournaments') }}
    </template>
  </UDashboardPanel>
</template>
