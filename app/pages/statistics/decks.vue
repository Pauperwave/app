<script lang="ts" setup>

</script>

<template>
  <UDashboardPanel id="decks">
    <template #header>
      <UDashboardNavbar title="Decks">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <EventsAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <!-- <HomeDateRangePicker v-model="range" class="-ms-1" /> -->
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
