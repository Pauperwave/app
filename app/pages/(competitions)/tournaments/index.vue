<!-- app\pages\(competitions)\tournaments\index.vue -->
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
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsListAddModal v-model="isModalOpen" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class aligns with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <TournamentsTable :range="range" /> -->
      {{ $t('tournament.list.pageBody') }}

      <!-- TODO: temporary, remove once the table with real data
           replaces this placeholder -->
      <UButton
        to="/tournaments/1"
        variant="outline"
        color="neutral"
        class="mt-4"
        icon="i-lucide-chevron-right"
      >
        {{ $t('common.dummyLinkLabel') }}
      </UButton>
    </template>
  </UDashboardPanel>
</template>
