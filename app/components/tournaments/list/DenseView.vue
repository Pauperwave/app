<!-- app\components\tournaments\list\DenseView.vue -->
<!-- Third view mode beside table/grid: a dense grid of small DenseCard.vue tiles, packing far
     more tournaments per screen than GridView.vue's full-size cards. It mirrors GridView.vue's
     props/loading shape exactly, including its one-section-per-status grouping. -->
<script setup lang="ts">
// fallow-ignore-file code-duplication -- the loading/section shell mirrors GridView.vue
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournaments,
  contextMenuItems,
  selection,
  loading = false,
  loadingCount = 12
} = defineProps<{
  tournaments: Tournament[]
  contextMenuItems: (tournament: Tournament) => DropdownMenuItem[]
  selection: Selection<number>
  /** Renders `loadingCount` skeleton tiles instead of `tournaments` — see
   * DenseCard.vue's own `loading` prop. @default false */
  loading?: boolean
  loadingCount?: number
}>()

// Same status sections/order/range as GridView.vue — useTournamentStatusSections.ts.
const { sections, range } = useTournamentStatusSections(() => tournaments)
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
    <div v-for="section in sections" :key="section.key">
      <TournamentsListSectionHeader
        :label="section.label"
        :color="section.color"
        :icon="section.icon"
        :count="section.tournaments.length"
      />

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
