<!-- app\pages\index.vue -->
<script setup lang="ts">
import { sub } from 'date-fns'
import type { Period, Range } from '~/types'

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')

const tour = useHomeTour()
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :title="$t('nav.dashboard')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :label="$t('home.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <div id="tour-home-quick-create">
            <HomeQuickCreateMenu />
          </div>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <div id="tour-home-filters" class="flex items-center gap-2 -ms-1">
            <HomeDateRangePicker v-model="range" />

            <HomePeriodSelect v-model="period" :range="range" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div id="tour-home-stats">
        <HomeStats :period="period" :range="range" />
      </div>
      <div id="tour-home-chart">
        <HomeChart :period="period" :range="range" />
      </div>
      <div id="tour-home-sales">
        <HomeSales :period="period" :range="range" />
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
