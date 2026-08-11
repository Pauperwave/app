<!-- app\pages\(community)\transactions\index.vue -->
<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)
const { t } = useI18n()

// Same StatusFilterGroup used by tournaments/leagues/events (#left) with
// HomeDateRangePicker in #right, not UTabs.
const typeTabs = [
  { label: t('transaction.tabs.all'), value: 'all' },
  { label: t('transaction.tabs.associationFee'), value: 'association-fee' },
  { label: t('transaction.tabs.eventFee'), value: 'event-fee' },
  { label: t('transaction.tabs.donations'), value: 'donations' }
]

const activeTypeTab = computed({
  get: () => (typeof route.query.type === 'string' ? route.query.type : 'all'),
  set: (value: string | number) => {
    router.replace({ query: { ...route.query, type: value === 'all' ? undefined : value } })
  }
})

onMounted(() => {
  if (route.query.action === 'create') {
    isModalOpen.value = true
    router.replace({ query: {} })
  }
})
</script>

<template>
  <UDashboardPanel id="payments">
    <template #header>
      <UDashboardNavbar :title="$t('transaction.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TransactionsListAddModal v-model="isModalOpen" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar
        :ui="{
          root: 'flex-wrap h-auto py-2 gap-4',
          left: 'gap-4 flex-wrap',
          right: 'gap-4 flex-wrap'
        }"
      >
        <template #left>
          <StatusFilterGroup v-model="activeTypeTab" :items="typeTabs" />
        </template>

        <template #right>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
