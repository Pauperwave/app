<!-- app\components\leagues\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  leagues, contextMenuItems, onEdit, selection
} = defineProps<{
  leagues: League[]
  contextMenuItems: (league: League) => DropdownMenuItem[]
  onEdit: (league: League) => void
  selection: Selection<number>
}>()

// The ordered list a shift-click range resolves against — same reasoning as
// TournamentsListGridView.vue's own range.
const range = computed(() => leagues.map(league => league.id))
</script>

<template>
  <div v-if="!leagues.length" class="text-center py-12 text-muted">
    {{ $t('league.grid.empty') }}
  </div>

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
