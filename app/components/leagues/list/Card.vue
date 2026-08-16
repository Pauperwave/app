<!-- app\components\leagues\list\Card.vue -->
<!--
  Leagues' own version of TournamentsListCard.vue (2026-08-16, "make the
  leagues cards match the tournaments cards") — same cover/checkbox/edit
  layout and hover treatment, adapted to League's fields: a ruleset badge
  instead of format/location, a tournament-progress bar instead of
  players/entry-fee (leagues have neither). Status shows through the card's
  own styling rather than a badge, same convention as Card.vue: completed
  recedes via opacity, cancelled gets a strikethrough+error title, active
  gets Cover.vue's pulsing dot.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  league, contextMenuItems, onEdit, selection, range
} = defineProps<{
  league: League
  contextMenuItems: (league: League) => DropdownMenuItem[]
  onEdit: (league: League) => void
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range: number[]
}>()

const { t } = useI18n()

// Same ctrl/cmd/shift-click convention as TournamentsListCard.vue.
function onCardClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    selection.toggle(league.id, { shiftKey: event.shiftKey, range })
    return
  }
  navigateTo(`/leagues/${league.uuid}`)
}

function progress(current: League) {
  if (!current.tournamentCount) return 0
  return Math.round((current.completedTournamentCount / current.tournamentCount) * 100)
}
</script>

<template>
  <UContextMenu :items="contextMenuItems(league)">
    <UCard
      class="overflow-hidden cursor-pointer group transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1
        hover:scale-[1.02] hover:ring-primary"
      :class="{ 'opacity-60 saturate-50': league.status === 'completed' }"
      :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
      @click="onCardClick"
    >
      <LeaguesListCover :league="league" :selection="selection" :range="range" />

      <div class="flex items-start justify-between gap-2">
        <h3
          class="font-semibold truncate min-w-0"
          :class="{ 'line-through text-error': league.status === 'cancelled' }"
        >
          {{ league.name }}
        </h3>

        <EditIconButton
          :label="t('league.rowActions.edit')"
          size="xs"
          class="shrink-0"
          @click.stop="onEdit(league)"
        />
      </div>

      <div v-if="league.ruleset" class="flex items-center gap-2 mt-1.5 flex-nowrap overflow-hidden">
        <UBadge
          color="neutral"
          variant="subtle"
          :icon="ICONS.bookOpen"
          class="shrink-0"
        >
          {{ league.ruleset }}
        </UBadge>
      </div>

      <template #footer>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-sm text-muted">
            <span>{{ t('league.tournamentsLabel') }}</span>
            <span>{{ t('league.progress', {
              completed: league.completedTournamentCount, total: league.tournamentCount
            }) }}</span>
          </div>
          <UProgress :model-value="progress(league)" size="sm" />
        </div>
      </template>
    </UCard>
  </UContextMenu>
</template>
