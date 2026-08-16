<!-- app\components\tournaments\list\Card.vue -->
<!--
  Extracted out of GridView.vue (2026-08-16) — a single tournament's card,
  including its own context menu and selection-checkbox wiring. GridView.vue
  now only owns the grid layout and the shared `range` a shift-click resolves
  against. Cover.vue (image/date chip/status dot/checkbox) and
  LeagueLink.vue (the "tappa" text link under the title) were split out the
  same day for SRP — this file is now the orchestrator: layout + click/
  selection wiring only, no per-section rendering details.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  tournament, contextMenuItems, onEdit, selection, range
} = defineProps<{
  tournament: Tournament
  contextMenuItems: (tournament: Tournament) => DropdownMenuItem[]
  onEdit: (tournament: Tournament) => void
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range: number[]
}>()

const { t } = useI18n()

// Ctrl/Cmd+click or shift+click anywhere on the card toggles/range-selects
// instead of navigating — same modifier convention as a file manager, lets a
// visitor select without having to land precisely on the (small,
// hover-revealed) checkbox in Cover.vue.
function onCardClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    selection.toggle(tournament.id, { shiftKey: event.shiftKey, range })
    return
  }
  navigateTo(tournamentDetailUrl(tournament))
}

function timePart(startDate: string) {
  return new Date(startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <UContextMenu :items="contextMenuItems(tournament)">
    <UCard
      class="overflow-hidden cursor-pointer group transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1
        hover:scale-[1.02] hover:ring-primary"
      :class="{ 'opacity-60 saturate-50': tournament.status === 'completed' }"
      :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
      @click="onCardClick"
    >
      <TournamentsListCover :tournament="tournament" :selection="selection" :range="range" />

      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3
            class="font-semibold truncate"
            :class="{ 'line-through text-error': tournament.status === 'cancelled' }"
          >
            {{ tournament.name }}
          </h3>

          <TournamentsListLeagueLink
            :league="tournament.league"
            :league-uuid="tournament.leagueUuid"
          />
        </div>

        <EditIconButton
          :label="t('tournament.rowActions.edit')"
          size="xs"
          class="shrink-0"
          @click.stop="onEdit(tournament)"
        />
      </div>

      <div class="flex items-center gap-2 mt-1.5 flex-nowrap overflow-hidden">
        <BadgesFormatBadge :format="tournament.format" :icon="ICONS.gameplay" class="shrink-0" />

        <UBadge
          color="neutral"
          variant="subtle"
          :icon="ICONS.clock"
          class="shrink-0"
        >
          {{ timePart(tournament.startDate) }}
        </UBadge>

        <BadgesLocationBadge
          v-if="tournament.location"
          :location="tournament.location"
          :location-address="tournament.locationAddress"
          :maps-url="tournament.locationMapsUrl"
          class="min-w-0"
        />
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <UBadge color="neutral" variant="subtle" :icon="ICONS.players">
            {{ tournament.registeredPlayers }}
          </UBadge>
          <span class="font-medium">{{ (tournament.entryFee ?? 0).toFixed(2) }} €</span>
        </div>
      </template>
    </UCard>
  </UContextMenu>
</template>
