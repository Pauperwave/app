<!-- app\components\events\CalendarEventCard.vue -->
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

// Same reasoning as CalendarTournamentCard.vue's timeRange.
function tournamentTimeRange(tournament: Tournament): string {
  const start = format(new Date(tournament.startDate), 'HH:mm')
  const end = format(new Date(tournament.endDate), 'HH:mm')
  return `${start}–${end}`
}

// No Event.participants field of its own — an event's pre-registration
// count is the union of its tournaments' own lists (user request 2026-08-14).
const participants = computed(() => tournaments.flatMap(tournament => tournament.participants))
</script>

<template>
  <EventsCalendarCard
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
        <div
          v-for="tournament in tournaments"
          :key="tournament.id"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
        >
          <span
            class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
            :class="cittadinoFormatClass(tournament.format)"
          >
            {{ tournament.format }}
          </span>

          <span class="truncate flex-1 min-w-0">{{ tournament.name }}</span>

          <UBadge
            :color="tournamentStatusColor(tournament.status)"
            variant="subtle"
            :icon="TOURNAMENT_STATUS_ICONS[tournament.status]"
            size="sm"
            class="shrink-0"
          >
            {{ t(`event.status.${tournament.status}`) }}
          </UBadge>

          <span class="text-muted text-xs shrink-0">
            {{ tournamentTimeRange(tournament) }}
          </span>
        </div>
      </div>
    </template>
  </EventsCalendarCard>
</template>
