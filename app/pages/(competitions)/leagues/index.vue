<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <UDashboardPanel id="leagues">
    <template #header>
      <UDashboardNavbar title="Leghe">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <LeaguesAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
        <template #right>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <LeaguesTable :period="period" :range="range" /> -->
      test
    </template>
  </UDashboardPanel>
</template>
