<!-- app\components\events\CalendarTournamentCard.vue -->
<!--
  Standalone-tournament variant of CalendarCard.vue (see
  PublicCalendarPage.vue) — format chip + time range sit in the #body slot,
  inline next to the shared header, since there's no nested list below.
-->
<script lang="ts" setup>
import { format } from 'date-fns'
import type { Tournament } from '~/types'

interface Props {
  tournament: Tournament
}

const { tournament } = defineProps<Props>()

// Tournament.startDate/endDate are explicit fields (server/api/tournaments.ts,
// fake for now — a real "inizio"/"fine" pair once a Supabase table backs
// this), not derived from roundCount/roundDuration — so overlapping
// tournaments within the same event show real, distinct ranges.
const timeRange = computed(() => {
  const start = format(new Date(tournament.startDate), 'HH:mm')
  const end = format(new Date(tournament.endDate), 'HH:mm')
  return `${start}–${end}`
})

const selection = useCalendarDetail()
function openDetail() {
  selection.value = { kind: 'tournament', tournament }
}
</script>

<template>
  <EventsCalendarCard
    :name="tournament.name"
    :start-date="tournament.startDate"
    :status="tournament.status"
    :location="tournament.location"
    :image="tournament.image"
    :ics-item="tournament"
    :participants="tournament.participants"
    @select="openDetail"
  >
    <template #meta>
      <p class="flex items-center gap-1 text-sm text-muted mt-1">
        <UIcon :name="ICONS.clock" class="size-4 shrink-0" />
        <span>{{ timeRange }}</span>
      </p>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm">
        <span
          class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
          :class="cittadinoFormatClass(tournament.format)"
        >
          {{ tournament.format }}
        </span>
      </div>
    </template>
  </EventsCalendarCard>
</template>
