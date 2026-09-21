<!-- app\components\events\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  events, contextMenuItems, onEdit, selection,
  loading = false, loadingCount = 6
} = defineProps<{
  events: Event[]
  contextMenuItems: (event: Event) => DropdownMenuItem[]
  onEdit: (event: Event) => void
  selection: Selection<number>
  /** Renders `loadingCount` skeleton cards instead of `events` — see
   * Card.vue's own `loading` prop. @default false */
  loading?: boolean
  loadingCount?: number
}>()

// One section per status, most actionable first — empty statuses are skipped.
const STATUS_ORDER: Event['status'][] = ['ongoing', 'published', 'draft', 'completed', 'cancelled']
const sections = computed(() => STATUS_ORDER
  .map(status => ({ status, events: events.filter(event => event.status === status) }))
  .filter(section => section.events.length))

// The ordered list a shift-click range resolves against, flattened in drawn
// order so it follows the sections.
const range = computed(() => sections.value.flatMap(section => section.events).map(event => event.id))
</script>

<template>
  <div v-if="loading" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <EventsListCard
      v-for="n in loadingCount"
      :key="n"
      loading
    />
  </div>

  <EmptyState
    v-else-if="!events.length"
    :message="$t('event.grid.empty')"
  />

  <div v-else class="flex flex-col gap-6">
    <div v-for="section in sections" :key="section.status">
      <div class="flex items-center gap-1.5 mb-3">
        <UBadge
          :color="eventStatusColor(section.status)"
          variant="subtle"
          :icon="EVENT_STATUS_ICONS[section.status]"
        >
          {{ $t(`event.status.${section.status}`) }}
        </UBadge>
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ section.events.length }}
        </UBadge>
      </div>

      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
        <EventsListCard
          v-for="event in section.events"
          :key="event.id"
          :event="event"
          :context-menu-items="contextMenuItems"
          :on-edit="onEdit"
          :selection="selection"
          :range="range"
        />
      </div>
    </div>
  </div>
</template>
