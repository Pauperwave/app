<!-- app\pages\(competitions)\events\[eventId]\index.vue -->
<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()
</script>

<template>
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

        <template #right>
          <UButton
            :to="`/events/${route.params.eventId}/tournaments`"
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
      {{ $t('event.detail.body.specificEvent') }}

      {{ $t('event.detail.body.eventDetails') }}

      {{ $t('event.detail.body.participantsList') }}

      {{ $t('event.detail.body.linkedTournaments') }}
    </template>
  </UDashboardPanel>
</template>
