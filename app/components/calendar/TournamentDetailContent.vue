<!-- app\components\calendar\TournamentDetailContent.vue -->
<!-- Extracted from DetailSlideover.vue's `selection?.kind === 'tournament'` branch (see
     EventDetailContent.vue's header for why it isn't a shared component with it). The hero
     (image/gradient/title/close button) lives in TournamentDetailHero.vue, rendered in
     USlideover's #header slot: this is #body content only. -->
<script setup lang="ts">
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Tournament } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()

const timeRange = computed(() => tournamentTimeRange(tournament.startDate, tournament.endDate))
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-col gap-2 text-sm text-muted mb-4">
      <CalendarDetailFact :icon="ICONS.calendar">
        {{ format(new Date(tournament.startDate), 'PPPP', { locale: it }) }}
        · {{ timeRange }}
      </CalendarDetailFact>
      <a
        v-if="tournament.location"
        :href="googleMapsUrl(
          tournament.locationAddress ?? tournament.location
        )"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 hover:underline w-fit"
      >
        <UIcon :name="ICONS.mapPin" class="size-5 shrink-0" />
        {{ tournament.location }}
      </a>
      <CalendarDetailFact v-if="tournament.organizer" :icon="ICONS.player">
        {{ t('tournament.columns.organizer') }}: {{ tournament.organizer }}
      </CalendarDetailFact>
      <a
        v-if="tournament.contactName"
        :href="`tel:${tournament.contactPhone}`"
        class="flex items-center gap-2 hover:underline w-fit"
      >
        <UIcon :name="ICONS.phone" class="size-5 shrink-0" />
        {{ t('tournament.contact') }}: {{ tournament.contactName }}
      </a>
      <CalendarTournamentTerms :tournament="tournament" />
    </div>

    <p v-if="tournament.description" class="text-sm whitespace-pre-line mb-4">
      {{ tournament.description }}
    </p>

    <div class="flex flex-wrap gap-2 mb-4">
      <CalendarButtonShareButton
        :name="`${tournament.name}${tournamentStageText(tournament)}`"
        :start-date="tournament.startDate"
      />
      <CalendarButtonAddToCalendarButton :item="tournament" />
      <CalendarButtonRegisterButton :tournament="tournament" />
    </div>

    <CalendarTournamentParticipants :participants="tournament.participants" />
  </div>
</template>
