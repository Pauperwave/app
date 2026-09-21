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

// One section per status, active first — empty statuses are skipped.
const STATUS_ORDER: League['status'][] = ['active', 'draft', 'completed', 'cancelled']
const sections = computed(() => STATUS_ORDER
  .map(status => ({ status, leagues: leagues.filter(league => league.status === status) }))
  .filter(section => section.leagues.length))

// The ordered list a shift-click range resolves against, flattened in drawn
// order so it follows the sections.
const range = computed(() => sections.value
  .flatMap(section => section.leagues)
  .map(league => league.id))
</script>

<template>
  <div v-if="loading" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <LeaguesListCard
      v-for="n in loadingCount"
      :key="n"
      loading
    />
  </div>

  <EmptyState
    v-else-if="!leagues.length"
    :message="$t('league.grid.empty')"
  />

  <div v-else class="flex flex-col gap-6">
    <div v-for="section in sections" :key="section.status">
      <div class="flex items-center gap-1.5 mb-3">
        <UBadge
          :color="leagueStatusColor(section.status)"
          variant="subtle"
          :icon="LEAGUE_STATUS_ICONS[section.status]"
        >
          {{ $t(`league.status.${section.status}`) }}
        </UBadge>
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ section.leagues.length }}
        </UBadge>
      </div>

      <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
        <LeaguesListCard
          v-for="league in section.leagues"
          :key="league.id"
          :league="league"
          :context-menu-items="contextMenuItems"
          :on-edit="onEdit"
          :selection="selection"
          :range="range"
        />
      </div>
    </div>
  </div>
</template>
