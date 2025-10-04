<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Period, Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar title="Statistics">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
