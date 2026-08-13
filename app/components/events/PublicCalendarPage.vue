<!-- app\components\events\PublicCalendarPage.vue -->
<!--
  Public (no auth) counterpart to pages/(competitions)/events/index.vue,
  backing eventi.pauperwave.org (settings/domains.vue). Same data composables,
  but a plain header instead of UDashboardPanel/Navbar (both require the
  authenticated UDashboardGroup context from layouts/default.vue), no
  EventsListAddModal/NotificationsBellButton (both need auth), and cards are
  not clickable — GridView.vue links to /events/<id>, the internal dashboard
  detail page, which would just bounce an anonymous visitor to /login. The
  internal dashboard page is untouched.
-->
<script lang="ts" setup>
import { add, format, sub } from 'date-fns'
import type { Range } from '~/types'

const { t } = useI18n()

useSeoMeta({ title: () => t('event.seoTitle') })

// Same "all time" default as the dashboard grid — a narrower default would
// start the page on an empty grid (see events/index.vue).
const range = shallowRef<Range>({
  start: sub(new Date(), { years: 10 }),
  end: add(new Date(), { years: 10 })
})

const { data: eventsData, isLoading: loading } = useEventsQuery()
const data = computed(() => eventsData.value ?? [])
const { statusFilter, filteredEvents, statusTabs } = useEventsFilters(data, range)
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <h1 class="text-xl font-semibold">
      {{ $t('event.breadcrumb') }}
    </h1>

    <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      class="shrink-0"
      :description="$t('common.mockDataNotice')"
    />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
    </div>

    <div
      v-else-if="!filteredEvents.length"
      class="text-center py-12 text-muted"
    >
      {{ $t('event.grid.empty') }}
    </div>

    <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
      <UCard v-for="event in filteredEvents" :key="event.id">
        <div class="flex items-start justify-between gap-2 mb-4">
          <h3 class="font-semibold truncate">
            {{ event.name }}
          </h3>
          <UBadge
            :color="eventStatusColor(event.status)"
            variant="subtle"
            :icon="EVENT_STATUS_ICONS[event.status]"
            class="shrink-0"
          >
            {{ t(`event.status.${event.status}`) }}
          </UBadge>
        </div>

        <div class="flex items-center justify-between text-sm text-muted">
          <span>{{ format(new Date(event.startDate), 'dd/MM/yyyy') }}</span>
          <span>{{ t('event.tournamentsLabel', event.tournamentCount) }}</span>
        </div>
      </UCard>
    </div>
  </div>
</template>
