<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <UDashboardPanel id="leagues">
    <template #header>
      <UDashboardNavbar :title="$t('league.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <LeaguesListAddModal v-model="isModalOpen" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <LeaguesTable :period="period" :range="range" /> -->
      {{ $t('league.placeholder') }}
    </template>
  </UDashboardPanel>
</template>
