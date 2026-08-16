<!-- app\components\calendar\EventDetailContent.vue -->
<!--
  Extracted out of DetailSlideover.vue's `selection?.kind === 'event'` branch
  (2026-08-16, fallow:health flagged the parent's whole <template> as
  high-complexity) — NOT a shared component with TournamentDetailContent.vue:
  the two branches diverge right after the shared hero markup (this one
  shows a nested tournaments list, the other shows organizer/contact/fee/
  prizes/description), so merging them was already rejected as
  over-abstraction (see feedback_dedup_threshold_call_sites memory). This
  split just moves each branch's own complexity out of the parent, it
  doesn't deduplicate anything.
-->
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
  <div class="relative overflow-hidden rounded-t-lg">
    <img
      :src="event.image ?? DEFAULT_CALENDAR_COVER_IMAGE"
      :alt="event.name"
      class="w-full max-h-80 sm:max-h-96 object-cover"
    >

    <div class="absolute inset-0 bg-linear-to-b from-transparent to-default" />

    <!-- TODO Da rimpiazzare con il bottone di condivisione -->
    <!-- <UButton
      :icon="ICONS.close"
      color="neutral"
      variant="subtle"
      square
      class="absolute top-4 inset-e-4"
      :aria-label="$t('common.close')"
      @click="close"
    /> -->

    <h2 class="absolute bottom-0 left-0 right-0 p-4 text-xl font-bold text-white truncate">
      {{ event.name }}
    </h2>
  </div>

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
        <BadgesFormatBadge :format="tournament.format" />
        <span class="truncate flex-1 min-w-0">{{ tournament.name }}</span>
        <span class="text-muted text-xs shrink-0">
          {{ tournamentTimeRange(tournament.startDate, tournament.endDate) }}
        </span>
      </button>
    </div>
  </div>
</template>
