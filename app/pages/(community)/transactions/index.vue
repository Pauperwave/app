<!-- app\pages\(community)\transactions\index.vue -->
<script lang="ts" setup>
import { sub } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import type { Range } from '~/types'

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)
const { t } = useI18n()

const typeTabs: TabsItem[] = [
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
      <UTabs
        v-model="activeTypeTab"
        :items="typeTabs"
        variant="link"
        class="w-full"
      />
    </template>
  </UDashboardPanel>
</template>
