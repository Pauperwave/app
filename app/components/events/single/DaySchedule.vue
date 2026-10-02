<!-- app\components\events\single\DaySchedule.vue -->
<!--
  The event page's calendar (user request, 2026-08-22, then 2026-10-02): one hour column per day —
  a single day in "Giorno" view, every event day side by side in "Settimana" — like Google Calendar.
  Click an empty slot to create a tournament on that day/time (seeds TournamentsListAddModal.vue's
  initialDate/initialTime/initialEventUuid), click a tournament to go to its page, its pencil to
  edit it. From 08:00 (or the earliest tournament) to 24:00.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { days, tournaments } = defineProps<{
  /** Local "YYYY-MM-DD" keys, one column each (see eventScheduleDays). */
  days: string[]
  tournaments: Tournament[]
}>()

const emit = defineEmits<{
  createTournament: [date: string, time: string]
  editTournament: [tournament: Tournament]
}>()

const DEFAULT_START_HOUR = 8
const END_HOUR = 24
const HOUR_HEIGHT_PX = 56

const startHour = computed(() => Math.min(
  DEFAULT_START_HOUR,
  ...tournaments.map(tournament => new Date(tournament.startDate).getHours())
))

const hours = computed(() => Array.from(
  { length: END_HOUR - startHour.value }, (_, i) => startHour.value + i
))

const tournamentsByDay = computed(() => new Map(days.map(day => [
  day,
  tournaments.filter(tournament => toLocalDateKey(new Date(tournament.startDate)) === day)
])))

function minutesFromStart(iso: string) {
  const parsed = new Date(iso)
  return (parsed.getHours() - startHour.value) * 60 + parsed.getMinutes()
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

function timeRange(tournament: Tournament) {
  const format = (iso: string) => new Date(iso)
    .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return tournament.endDate
    ? `${format(tournament.startDate)}–${format(tournament.endDate)}`
    : format(tournament.startDate)
}

function dayLabel(day: string) {
  return new Date(`${day}T00:00:00`)
    .toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

const gridColumns = computed(() => ({ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }))
</script>

<template>
  <div class="flex flex-col">
    <!-- Day headers, aligned with the columns below (the gutter keeps the hour labels' width). -->
    <div class="flex ps-12">
      <div class="grid flex-1 gap-px" :style="gridColumns">
        <div
          v-for="day in days"
          :key="day"
          class="pb-2 text-center text-sm font-semibold capitalize text-highlighted"
        >
          {{ dayLabel(day) }}
        </div>
      </div>
    </div>

    <div class="flex max-h-150 overflow-y-auto">
      <div class="flex w-12 shrink-0 flex-col pe-2 text-right text-xs text-muted">
        <div
          v-for="hour in hours"
          :key="hour"
          class="h-14 -translate-y-2"
        >
          {{ hourLabel(hour) }}
        </div>
      </div>

      <div class="grid flex-1 gap-px" :style="gridColumns">
        <div
          v-for="day in days"
          :key="day"
          class="relative border-s border-default"
        >
          <div
            v-for="hour in hours"
            :key="hour"
            class="h-14 cursor-pointer border-t border-default transition-colors hover:bg-elevated/50"
            :aria-label="$t('event.detail.schedule.addAt', { time: hourLabel(hour) })"
            @click="emit('createTournament', day, hourLabel(hour))"
          />

          <NuxtLink
            v-for="tournament in tournamentsByDay.get(day)"
            :key="tournament.id"
            :to="tournamentDetailUrl(tournament)"
            class="group absolute inset-x-1 flex flex-col overflow-hidden rounded-md px-2 py-1 text-left text-xs text-white shadow-sm transition hover:brightness-110"
            :class="tournamentStatusBgClass(tournament.status)"
            :style="blockStyle(tournament)"
            @click.stop
          >
            <span class="flex items-start justify-between gap-1">
              <span class="font-semibold leading-tight">
                {{ tournament.name }}{{ tournamentStageText(tournament) }}
              </span>
              <UButton
                :icon="ICONS.edit"
                :aria-label="$t('event.detail.schedule.edit', { name: tournament.name })"
                color="neutral"
                variant="ghost"
                size="xs"
                class="-me-1 -mt-0.5 shrink-0 text-white opacity-70 group-hover:opacity-100"
                @click.prevent.stop="emit('editTournament', tournament)"
              />
            </span>
            <span class="tabular-nums opacity-90">{{ timeRange(tournament) }}</span>
            <span class="truncate opacity-90">{{ tournament.format }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
