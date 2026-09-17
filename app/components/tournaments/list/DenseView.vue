<!-- app\components\tournaments\list\DenseView.vue -->
<!--
  Third view mode alongside table/grid — a dense grid of small
  DenseCard.vue tiles, packing far more tournaments per screen than
  GridView.vue's full-size cards. Mirrors GridView.vue's own props/loading
  shape exactly (no sections/grouping — tournaments' grid never grouped
  either, only the table does).
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

const range = computed(() => tournaments.map(tournament => tournament.id))
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

  <div v-else class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(180px,42vw),1fr))]">
    <TournamentsListDenseCard
      v-for="tournament in tournaments"
      :key="tournament.id"
      :tournament="tournament"
      :context-menu-items="contextMenuItems"
      :selection="selection"
      :range="range"
    />
  </div>
</template>
