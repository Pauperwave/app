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

// The ordered list a shift-click range resolves against — same reasoning as
// TournamentsListGridView.vue's own range.
const range = computed(() => events.map(event => event.id))
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

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <EventsListCard
      v-for="event in events"
      :key="event.id"
      :event="event"
      :context-menu-items="contextMenuItems"
      :on-edit="onEdit"
      :selection="selection"
      :range="range"
    />
  </div>
</template>
