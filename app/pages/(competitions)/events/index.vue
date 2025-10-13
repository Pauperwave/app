<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

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
      <UDashboardNavbar title="Eventi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <EventsListAddModal v-model="isModalOpen" />
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
      Pagina eventi
    </template>
  </UDashboardPanel>
</template>
