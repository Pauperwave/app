<!-- app\components\tournaments\list\DenseView.vue -->
<!--
  Third view mode alongside table/grid — a dense grid of small
  DenseCard.vue tiles, packing far more tournaments per screen than
  GridView.vue's full-size cards. Mirrors GridView.vue's own props/loading
  shape exactly, including its one-section-per-status grouping.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournaments, contextMenuItems, selection, loading = false, loadingCount = 12
} = defineProps<{
  tournaments: Tournament[]
  contextMenuItems: (tournament: Tournament) => DropdownMenuItem[]
  selection: Selection<number>
  /** Renders `loadingCount` skeleton tiles instead of `tournaments` — see
   * DenseCard.vue's own `loading` prop. @default false */
  loading?: boolean
  loadingCount?: number
}>()

// Same status sections/order as GridView.vue — empty statuses are skipped.
const STATUS_ORDER: Tournament['status'][] = [
  'in_progress', 'registration_open', 'draft', 'completed', 'cancelled', 'external'
]
const sections = computed(() => STATUS_ORDER
  .map(status => ({
    status,
    tournaments: tournaments.filter(tournament => tournament.status === status)
  }))
  .filter(section => section.tournaments.length))

// Flattened in drawn order so a shift-click range follows the sections.
const range = computed(() => sections.value
  .flatMap(section => section.tournaments)
  .map(tournament => tournament.id))
</script>

<template>
  <div
    v-if="loading"
    class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(180px,42vw),1fr))]"
  >
    <TournamentsListDenseCard
      v-for="n in loadingCount"
      :key="n"
      loading
    />
  </div>

  <EmptyState v-else-if="!tournaments.length" :message="$t('tournament.grid.empty')" />

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

      <div class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(180px,42vw),1fr))]">
        <TournamentsListDenseCard
          v-for="tournament in section.tournaments"
          :key="tournament.id"
          :tournament="tournament"
          :context-menu-items="contextMenuItems"
          :selection="selection"
          :range="range"
        />
      </div>
    </div>
  </div>
</template>
