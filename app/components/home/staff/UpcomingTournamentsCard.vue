<!-- app\components\home\staff\UpcomingTournamentsCard.vue -->
<!-- Split out of home/Staff.vue (2026-08-29, fallow:health) — see
     PendingActionsCard.vue's own comment. -->
<script setup lang="ts">
import type { Tournament } from '~/types'

defineProps<{ tournaments: Tournament[] }>()
</script>

<template>
  <UPageCard id="tour-home-upcoming" :title="$t('home.staff.upcoming.title')" variant="subtle">
    <div v-if="!tournaments.length" class="text-sm text-muted py-4 text-center">
      {{ $t('home.staff.upcoming.empty') }}
    </div>

    <div v-else class="flex flex-col divide-y divide-default">
      <NuxtLink
        v-for="tournament in tournaments"
        :key="tournament.uuid"
        :to="tournamentDetailUrl(tournament)"
        class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
          rounded-md hover:bg-elevated/50 hover:text-highlighted"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">
            {{ tournament.name }}
            <TournamentsStageLabel
              v-if="tournament.stageNumber"
              :number="tournament.stageNumber"
            />
          </p>
          <p class="text-sm text-muted">
            {{ tournament.format }} ·
            <DateWithRelativeTooltip :iso-string="tournament.startDate" :time="false" />
          </p>
        </div>
        <TournamentsStatusBadge :tournament="tournament" />
      </NuxtLink>
    </div>
  </UPageCard>
</template>
