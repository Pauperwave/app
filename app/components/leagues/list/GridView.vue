<!-- app\components\leagues\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  leagues, contextMenuItems, onEdit, selection,
  loading = false, loadingCount = 6
} = defineProps<{
  leagues: League[]
  contextMenuItems: (league: League) => DropdownMenuItem[]
  onEdit: (league: League) => void
  selection: Selection<number>
  /** Renders `loadingCount` skeleton cards instead of `leagues` — see
   * Card.vue's own `loading` prop. @default false */
  loading?: boolean
  loadingCount?: number
}>()

// The ordered list a shift-click range resolves against — same reasoning as
// TournamentsListGridView.vue's own range.
const range = computed(() => leagues.map(league => league.id))
</script>

<template>
  <div v-if="loading" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <LeaguesListCard v-for="n in loadingCount" :key="n" loading />
  </div>

  <EmptyState
    v-else-if="!leagues.length"
    :message="$t('league.grid.empty')"
  />

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <LeaguesListCard
      v-for="league in leagues"
      :key="league.id"
      :league="league"
      :context-menu-items="contextMenuItems"
      :on-edit="onEdit"
      :selection="selection"
      :range="range"
    />
  </div>
</template>
