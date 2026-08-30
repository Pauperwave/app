<!-- app\components\ui\ListPageNavbar.vue -->
<!--
  Shared UDashboardNavbar skeleton for list pages: sidebar collapse +
  QueryRefreshControl in #trailing, then a "start tour" button in #right
  (fallow:dupes flagged this exact block as an identical clone across
  associates/index.vue, associates/requests.vue, locations/index.vue,
  players/index.vue and transactions/index.vue). Whatever else a page needs
  in #right (view mode tabs, an add-modal trigger, NotificationsBellButton…)
  goes in the default slot, rendered right after the tour button's separator.
-->
<script setup lang="ts">
import type { DashboardNavbarProps } from '@nuxt/ui'
import type { DataStateStatus } from '@pinia/colada'

interface Props {
  title: string
  tourLabel: string
  loading: boolean
  status: DataStateStatus
  ui?: DashboardNavbarProps['ui']
}

const {
  title, tourLabel, loading, status, ui
} = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
  tourStart: []
}>()
</script>

<template>
  <UDashboardNavbar :title="title" :ui="ui">
    <template #leading>
      <UDashboardSidebarCollapse />
    </template>

    <template #trailing>
      <USeparator orientation="vertical" class="h-4" />

      <!-- Optional, next to the title on the left, before QueryRefreshControl
           (unlike the default slot, rendered on the navbar's right) — used by
           transactions/index.vue's search box (user request, 2026-08-30). -->
      <slot name="search" />

      <QueryRefreshControl :is-loading="loading" :status="status" @refresh="emit('refresh')" />
    </template>

    <template #right>
      <TourStartButton :label="tourLabel" @start="emit('tourStart')" />

      <USeparator orientation="vertical" class="h-4" />

      <slot />
    </template>
  </UDashboardNavbar>
</template>
