<!-- app\components\tournaments\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournaments, contextMenuItems, onEdit, selection, highlightedTournamentId = null, onHoverChange
} = defineProps<{
  tournaments: Tournament[]
  contextMenuItems: (tournament: Tournament) => DropdownMenuItem[]
  onEdit: (tournament: Tournament) => void
  selection: Selection<number>
  /** Forwarded to the matching card's own `highlighted` prop — see Card.vue. */
  highlightedTournamentId?: number | null
  /** Forwarded to every card's own `onHoverChange` prop — see Card.vue. */
  onHoverChange?: (tournament: Tournament | null) => void
}>()

// The ordered list a shift-click range resolves against — the currently
// rendered (already filtered) cards, same reasoning as the table's own
// range (useTournamentsTableColumns.ts). Passed down to each Card.vue rather
// than recomputed per-card.
const range = computed(() => tournaments.map(tournament => tournament.id))
</script>

<template>
  <div v-if="!tournaments.length" class="text-center py-12 text-muted">
    {{ $t('tournament.grid.empty') }}
  </div>

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <TournamentsListCard
      v-for="tournament in tournaments"
      :key="tournament.id"
      :tournament="tournament"
      :context-menu-items="contextMenuItems"
      :on-edit="onEdit"
      :selection="selection"
      :range="range"
      :highlighted="tournament.id === highlightedTournamentId"
      :on-hover-change="onHoverChange"
    />
  </div>
</template>
