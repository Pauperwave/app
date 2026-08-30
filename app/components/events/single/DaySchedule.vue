<!-- app\components\events\single\DaySchedule.vue -->
<!--
  Replaces the event detail page's own CalendarHeatmap (user request,
  2026-08-22 — "a custom calendar view of that specific day... similarly to
  Google Calendar I can click and create a tournament in that day"). No
  existing day/time-grid component in the codebase to build on — the public
  calendar page is a month-scoped list of cards, and CalendarHeatmap itself
  is a day-cell heatmap, not an hourly grid — so this is a from-scratch
  08:00-24:00 hour column: click an empty slot to seed
  TournamentsListAddModal.vue's initialDate/initialTime/initialEventUuid
  props (see that file's own comment), click an existing tournament's block
  to open it for editing instead. Only 08:00-24:00, not the full 24h: no
  Pauperwave tournament has ever started before 08:00, and scrolling past
  a wall of empty pre-dawn hours isn't worth the completeness.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { date, tournaments } = defineProps<{
  /** The day this schedule shows — the event's own startDate. */
  date: string
  /** This event's own tournaments — filtered further to just the ones
   * actually landing on `date` (a multi-day event's tournaments could span
   * other days too). */
  tournaments: Tournament[]
}>()

const emit = defineEmits<{
  createTournament: [time: string]
  openTournament: [tournament: Tournament]
}>()

const START_HOUR = 8
const END_HOUR = 24
const HOUR_HEIGHT_PX = 56

const hours = computed(() => Array.from(
  { length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i
))

const dayKey = computed(() => toLocalDateKey(new Date(date)))
const dayTournaments = computed(() => tournaments.filter(
  tournament => toLocalDateKey(new Date(tournament.startDate)) === dayKey.value
))

function minutesFromStart(iso: string) {
  const parsed = new Date(iso)
  return (parsed.getHours() - START_HOUR) * 60 + parsed.getMinutes()
}

// Falls back to a 3h block when a tournament has no endDate (same default
// duration TournamentsListAddModal.vue's own endTime field starts at) —
// floors at 30min so a same-time start/end doesn't collapse to an
// unreadable sliver.
function blockStyle(tournament: Tournament) {
  const topMinutes = minutesFromStart(tournament.startDate)
  const durationMinutes = tournament.endDate
    ? Math.max(30, (new Date(tournament.endDate).getTime()
      - new Date(tournament.startDate).getTime()) / 60000)
    : 180
  return {
    top: `${(topMinutes / 60) * HOUR_HEIGHT_PX}px`,
    height: `${(durationMinutes / 60) * HOUR_HEIGHT_PX}px`
  }
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function onSlotClick(hour: number) {
  emit('createTournament', hourLabel(hour))
}
</script>

<template>
  <div class="flex max-h-125 overflow-y-auto">
    <div class="flex flex-col text-xs text-muted pe-2 text-right shrink-0">
      <div
        v-for="hour in hours"
        :key="hour"
        class="h-14 -translate-y-2"
      >
        {{ hourLabel(hour) }}
      </div>
    </div>

    <div class="relative flex-1 border-s border-default">
      <div
        v-for="hour in hours"
        :key="hour"
        class="h-14 border-t border-default cursor-pointer hover:bg-elevated/50 transition-colors"
        :aria-label="$t('event.detail.schedule.addAt', { time: hourLabel(hour) })"
        @click="onSlotClick(hour)"
      />

      <button
        v-for="tournament in dayTournaments"
        :key="tournament.id"
        type="button"
        class="absolute inset-x-1 rounded-md px-2 py-1 text-xs text-left overflow-hidden text-white cursor-pointer"
        :class="tournamentStatusBgClass(tournament.status)"
        :style="blockStyle(tournament)"
        @click.stop="emit('openTournament', tournament)"
      >
        <span class="font-medium truncate block">
          {{ tournament.name }}{{ tournamentStageText(tournament) }}
        </span>
      </button>
    </div>
  </div>
</template>
