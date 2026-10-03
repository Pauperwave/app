<!-- app\components\calendar\EventDetailContent.vue -->
<!-- Extracted from DetailSlideover.vue's `selection?.kind === 'event'` branch (fallow:health
     flagged the parent's whole <template> as high-complexity): NOT a shared component with
     TournamentDetailContent.vue, as the two branches diverge right after the shared hero markup
     (this one shows a nested tournaments list, the other
     organizer/contact/fee/prizes/description), so merging them would be over-abstraction. This
     split only moves each branch's complexity out of the parent, it deduplicates nothing. The
     hero (image/gradient/title) lives in EventDetailHero.vue, rendered in USlideover's #header
     slot: this is #body content only. -->
<script setup lang="ts">
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Event, Tournament } from '~/types'

defineProps<{
  event: Event
  tournaments: Tournament[]
}>()

const emit = defineEmits<{ openTournament: [tournament: Tournament] }>()
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-col gap-2 text-sm text-muted mb-4">
      <p class="flex items-center gap-2">
        <UIcon :name="ICONS.calendar" class="size-5 shrink-0" />
        {{ format(new Date(event.startDate), 'PPPP', { locale: it }) }}
      </p>
      <a
        v-if="event.location"
        :href="googleMapsUrl(event.locationAddress ?? event.location)"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 hover:underline w-fit"
      >
        <UIcon :name="ICONS.mapPin" class="size-5 shrink-0" />
        {{ event.location }}
      </a>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <CalendarButtonShareButton
        :name="event.name"
        :start-date="event.startDate"
      />
      <CalendarButtonAddToCalendarButton :item="event" />
      <CalendarButtonRegisterButton />
    </div>

    <div v-if="tournaments.length" class="pt-4 border-t border-default flex flex-col gap-2">
      <p class="text-xs font-medium uppercase text-muted">
        {{ $t('tournament.breadcrumb') }}
      </p>

      <button
        v-for="tournament in tournaments"
        :key="tournament.id"
        type="button"
        class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-left hover:underline"
        @click="emit('openTournament', tournament)"
      >
        <BadgesFormatBadge :format="tournament.format" :icon="ICONS.gameplay" />
        <span class="truncate flex-1 min-w-0">
          {{ tournament.name }}
          <TournamentsStageLabel v-if="tournament.stageNumber" :number="tournament.stageNumber" />
        </span>
        <span class="text-muted text-xs shrink-0">
          {{ tournamentTimeRange(tournament.startDate, tournament.endDate) }}
        </span>
      </button>
    </div>
  </div>
</template>
