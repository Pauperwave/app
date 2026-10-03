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
const { isFull } = useTournamentSeatsQuery()

const timeRange = computed(() => tournamentTimeRange(tournament.startDate, tournament.endDate))
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-col gap-2 text-sm text-muted mb-4">
      <p class="flex items-center gap-2">
        <UIcon :name="ICONS.calendar" class="size-5 shrink-0" />
        {{ format(new Date(tournament.startDate), 'PPPP', { locale: it }) }}
        · {{ timeRange }}
      </p>
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
      <p v-if="tournament.organizer" class="flex items-center gap-2">
        <UIcon :name="ICONS.player" class="size-5 shrink-0" />
        {{ t('tournament.columns.organizer') }}: {{ tournament.organizer }}
      </p>
      <a
        v-if="tournament.contactName"
        :href="`tel:${tournament.contactPhone}`"
        class="flex items-center gap-2 hover:underline w-fit"
      >
        <UIcon :name="ICONS.phone" class="size-5 shrink-0" />
        {{ t('tournament.contact') }}: {{ tournament.contactName }}
      </a>
      <p v-if="tournament.entryFee !== null" class="flex items-center gap-2">
        <UIcon :name="ICONS.euro" class="size-5 shrink-0" />
        <template v-if="tournament.entryFeeNonMember !== null">
          {{ t('tournament.columns.entryFee') }}:
          {{ t('tournament.feeMembers', { amount: tournament.entryFee }) }}
          · {{ t('tournament.feeNonMembers', { amount: tournament.entryFeeNonMember }) }}
        </template>
        <template v-else>
          {{ t('tournament.columns.entryFee') }}: {{ tournament.entryFee }} €
        </template>
      </p>
      <p v-if="tournament.maxEntrants !== null" class="flex items-center gap-2">
        <UIcon :name="ICONS.players" class="size-5 shrink-0" />
        {{ t('tournament.maxEntrantsLabel', { count: tournament.maxEntrants }) }}
        <UBadge
          v-if="isFull(tournament.uuid)"
          color="error"
          variant="subtle"
          size="sm"
        >
          {{ t('tournament.full') }}
        </UBadge>
      </p>
      <p v-if="tournament.decklistVisibility" class="flex items-center gap-2">
        <UIcon :name="ICONS.lock" class="size-5 shrink-0" />
        {{ t(`tournament.decklistVisibility.${tournament.decklistVisibility}`) }}
      </p>
      <p v-if="tournament.registrationAt" class="flex items-center gap-2">
        <UIcon :name="ICONS.clock" class="size-5 shrink-0" />
        {{ t('tournament.registrationAtLabel', {
          time: new Date(tournament.registrationAt)
            .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        }) }}
      </p>
      <p v-if="tournament.prizes" class="flex items-center gap-2">
        <UIcon :name="ICONS.standings" class="size-5 shrink-0" />
        {{ t('tournament.columns.prizes') }}: {{ tournament.prizes }}
      </p>
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

    <div v-if="tournament.participants.length" class="pt-4 border-t border-default">
      <p class="text-xs font-medium uppercase text-muted mb-2">
        {{ t('tournament.participants') }} ({{ tournament.participants.length }})
      </p>
      <ul class="flex flex-col gap-2">
        <li
          v-for="(participant, index) in tournament.participants"
          :key="participant"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-dimmed w-4 text-right shrink-0">{{ index + 1 }}.</span>
          <UUser
            :name="participant"
            :avatar="{ src: generatePlayerAvatar(participant), alt: participant }"
            size="sm"
          />
        </li>
      </ul>
    </div>
  </div>
</template>
