<!-- app\components\calendar\card\Event.vue -->
<!--
  Event variant of CalendarCard.vue (see PublicCalendarPage.vue) — the
  nested tournament list sits in the #footer slot, full-width below the
  shared header. An Event card only exists when at least one Tournament
  actually names it (Tournament.event, see server/api/tournaments.ts).
-->
<script lang="ts" setup>
import { format } from 'date-fns'
import type { Event, Tournament } from '~/types'

interface Props {
  event: Event
  tournaments: Tournament[]
}

const { event, tournaments } = defineProps<Props>()

const { t } = useI18n()

const selection = useCalendarDetail()
function openDetail() {
  selection.value = { kind: 'event', event, tournaments }
}

// Tapping a specific tournament row jumps straight to its own detail
// instead of always landing on the event overview (user request 2026-08-14)
// — same target shape CalendarDetailSlideover.vue's own nested list already
// opens via openTournament().
function openTournamentDetail(tournament: Tournament) {
  selection.value = { kind: 'tournament', tournament }
}

// Same reasoning as CalendarTournamentCard.vue's timeRange (endDate nullable).
function tournamentTimeRange(tournament: Tournament): string {
  const start = format(new Date(tournament.startDate), 'HH:mm')
  if (!tournament.endDate) return start
  const end = format(new Date(tournament.endDate), 'HH:mm')
  return `${start}–${end}`
}

// No Event.participants field of its own — an event's pre-registration
// count is the union of its tournaments' own lists (user request 2026-08-14).
const participants = computed(() => tournaments.flatMap(tournament => tournament.participants))
</script>

<template>
  <CalendarCardBase
    :name="event.name"
    :start-date="event.startDate"
    :status="event.status"
    :location="event.location"
    :image="event.image"
    :ics-item="event"
    :participants="participants"
    @select="openDetail"
  >
    <template #footer>
      <div class="mt-3 pt-3 border-t border-default flex flex-col gap-2">
        <button
          v-for="tournament in tournaments"
          :key="tournament.id"
          type="button"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-elevated transition-colors"
          :class="{ 'opacity-60 saturate-50': tournament.status === 'completed' }"
          @click.stop="openTournamentDetail(tournament)"
        >
          <span
            class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
            :class="cittadinoFormatClass(tournament.format)"
          >
            {{ tournament.format }}
          </span>

          <span
            class="truncate flex-1 min-w-0"
            :class="{ 'line-through text-error': tournament.status === 'cancelled' }"
          >
            {{ tournament.name }}
          </span>

          <span
            v-if="tournament.status === 'in_progress'"
            class="size-2 rounded-full bg-warning shrink-0 animate-pulse motion-reduce:animate-none"
            :title="t('tournament.status.in_progress')"
          />

          <span class="text-muted text-xs shrink-0">
            {{ tournamentTimeRange(tournament) }}
          </span>
        </button>
      </div>
    </template>
  </CalendarCardBase>
</template>
