<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'

// const { isNotificationsSlideoverOpen } = useDashboard()

onMounted(() => {
  console.log('Index page mounted')
})

const items = [[{
  label: 'Registra transazione',
  icon: 'i-lucide-coins',
  to: '/transactions?action=create'
}, {
  label: 'Nuovo associato',
  icon: 'i-lucide-user-plus',
  to: '/associates?action=create'
}, {
  label: 'Nuovo torneo',
  icon: 'i-lucide-swords',
  to: '/tournaments?action=create'
}, {
  label: 'Nuovo evento',
  icon: 'i-lucide-calendar-plus',
  to: '/events?action=create'
}, {
  label: 'Nuova lega',
  icon: 'i-lucide-trophy',
  to: '/leagues?action=create'
}]] satisfies DropdownMenuItem[][]

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Pannello di controllo" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <!-- <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton color="neutral" variant="ghost" square @click="isNotificationsSlideoverOpen = true">
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip> -->

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <HomeStats :period="period" :range="range" />
      <HomeChart :period="period" :range="range" />
      <HomeSales :period="period" :range="range" />
    </template>
  </UDashboardPanel>
</template>
