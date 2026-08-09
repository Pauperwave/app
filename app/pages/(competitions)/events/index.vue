<!-- app\pages\(competitions)\events\index.vue -->
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
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar :title="$t('event.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <EventsListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
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
      {{ $t('event.placeholder') }}

      <!-- TODO: temporary, remove once the table with real data
           replaces this placeholder -->
      <UButton
        to="/events/1"
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
