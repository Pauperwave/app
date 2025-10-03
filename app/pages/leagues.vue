<script lang="ts" setup>

</script>

<template>
  <UDashboardPanel id="leagues">
    <template #header>
      <UDashboardNavbar title="Leagues">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <LeaguesAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          Inserisci un filtro per le leghe date dal formato
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <!-- <HomeDateRangePicker v-model="range" class="-ms-1" /> -->

          <!-- <HomePeriodSelect v-model="period" :range="range" /> -->
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
