<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const route = useRoute()
</script>

<template>
  <UDashboardPanel id="event-tournament">
    <template #header>
      <UDashboardNavbar :title="$t('event.tournamentDetail.navbarTitle')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
          <UButton
            :to="`/events/${route.params.eventId}/tournaments`"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="xs"
          >
            {{ $t('common.back') }}
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      {{ $t('event.tournamentDetail.body') }}
    </template>
  </UDashboardPanel>
</template>
