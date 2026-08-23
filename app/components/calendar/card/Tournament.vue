<!-- app\components\calendar\card\Tournament.vue -->
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

// Tournament.startDate/endDate are explicit fields (migration 20260815101000,
// tournaments.starts_at/ends_at), not derived from roundCount — so
// overlapping tournaments within the same event show real, distinct ranges.
// endDate is nullable (not every tournament has one set) — falls back to a
// dash rather than pretending there's a real end time.
const timeRange = computed(() => {
  const start = format(new Date(tournament.startDate), 'HH:mm')
  if (!tournament.endDate) return start
  const end = format(new Date(tournament.endDate), 'HH:mm')
  return `${start}-${end}`
})

const selection = useCalendarDetail()
function openDetail() {
  selection.value = { kind: 'tournament', tournament }
}
</script>

<template>
  <CalendarCardBase
    :name="`${tournament.name}${tournamentStageText(tournament)}`"
    :start-date="tournament.startDate"
    :status="tournament.status"
    :location="tournament.location"
    :location-address="tournament.locationAddress"
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
        <BadgesFormatBadge :format="tournament.format" :icon="ICONS.gameplay" />
      </div>
    </template>
  </CalendarCardBase>
</template>
