<!-- app\components\calendar\TournamentTerms.vue -->
<!-- The terms of a tournament in its calendar detail: fee, player cap (with "Posti esauriti" once
     it is reached), decklist rule, when registration opens and the prizes. Each line only shows
     when the tournament has it. -->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { tournament } = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()
const { isFull } = useTournamentSeatsQuery()

const registrationTime = computed(() => (tournament.registrationAt
  ? new Date(tournament.registrationAt)
    .toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  : null))
</script>

<template>
  <CalendarDetailFact v-if="tournament.entryFee !== null" :icon="ICONS.euro">
    <template v-if="tournament.entryFeeNonMember !== null">
      {{ t('tournament.columns.entryFee') }}:
      {{ t('tournament.feeMembers', { amount: tournament.entryFee }) }}
      · {{ t('tournament.feeNonMembers', { amount: tournament.entryFeeNonMember }) }}
    </template>
    <template v-else>
      {{ t('tournament.columns.entryFee') }}: {{ tournament.entryFee }} €
    </template>
  </CalendarDetailFact>

  <CalendarDetailFact v-if="tournament.maxEntrants !== null" :icon="ICONS.players">
    {{ t('tournament.maxEntrantsLabel', { count: tournament.maxEntrants }) }}
    <UBadge
      v-if="isFull(tournament.uuid)"
      color="error"
      variant="subtle"
      size="sm"
    >
      {{ t('tournament.full') }}
    </UBadge>
  </CalendarDetailFact>

  <CalendarDetailFact v-if="tournament.decklistVisibility" :icon="ICONS.lock">
    {{ t(`tournament.decklistVisibility.${tournament.decklistVisibility}`) }}
  </CalendarDetailFact>

  <CalendarDetailFact v-if="registrationTime" :icon="ICONS.clock">
    {{ t('tournament.registrationAtLabel', { time: registrationTime }) }}
  </CalendarDetailFact>

  <CalendarDetailFact v-if="tournament.prizes" :icon="ICONS.standings">
    {{ t('tournament.columns.prizes') }}: {{ tournament.prizes }}
  </CalendarDetailFact>
</template>
