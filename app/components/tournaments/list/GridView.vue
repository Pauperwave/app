<!-- app\components\tournaments\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournaments, contextMenuItems, onEdit, selection, highlightedTournamentId = null, onHoverChange,
  loading = false, loadingCount = 6
} = defineProps<{
  tournaments: Tournament[]
  contextMenuItems: (tournament: Tournament) => DropdownMenuItem[]
  onEdit: (tournament: Tournament) => void
  selection: Selection<number>
  /** Forwarded to the matching card's own `highlighted` prop — see Card.vue. */
  highlightedTournamentId?: number | null
  /** Forwarded to every card's own `onHoverChange` prop — see Card.vue. */
  onHoverChange?: (tournament: Tournament | null) => void
  /** Renders `loadingCount` skeleton cards instead of `tournaments` — see
   * Card.vue's own `loading` prop. @default false */
  loading?: boolean
  loadingCount?: number
}>()

// One section per status, most actionable first — useTournamentStatusSections.ts.
// Passed down to each Card.vue rather than recomputed per-card.
const { sections, range } = useTournamentStatusSections(() => tournaments)
</script>

<template>
  <div v-if="loading" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <TournamentsListCard
      v-for="n in loadingCount"
      :key="n"
      loading
    />
  </div>

  <EmptyState
    v-else-if="!tournaments.length"
    :message="$t('tournament.grid.empty')"
  />

  <div v-else class="flex flex-col gap-6">
    <div v-for="section in sections" :key="section.status">
      <div class="flex items-center gap-1.5 mb-3">
        <UBadge
          :color="tournamentStatusColor(section.status)"
          variant="subtle"
          :icon="TOURNAMENT_STATUS_ICONS[section.status]"
        >
          {{ $t(`tournament.status.${section.status}`) }}
        </UBadge>
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ section.tournaments.length }}
        </UBadge>
      </div>

      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
        <TournamentsListCard
          v-for="tournament in section.tournaments"
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
    </div>
  </div>
</template>
