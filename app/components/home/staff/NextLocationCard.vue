<!-- app\components\home\staff\NextLocationCard.vue -->
<!-- Split out of home/Staff.vue (2026-08-29, fallow:health) — see
     PendingActionsCard.vue's own comment. `tournament` here is the soonest
     upcoming tournament (Staff.vue's own nextTournamentLocation), read only
     for its location fields. -->
<script setup lang="ts">
import type { Tournament } from '~/types'

defineProps<{ tournament: Tournament | null }>()
</script>

<template>
  <UPageCard
    id="tour-home-next-location"
    :title="$t('home.staff.nextLocation.title')"
    variant="subtle"
  >
    <div v-if="!tournament?.location" class="text-sm text-muted py-4 text-center">
      {{ $t('home.staff.nextLocation.empty') }}
    </div>

    <div v-else class="flex items-start gap-3">
      <UIcon :name="ICONS.mapPin" class="size-5 text-muted shrink-0 mt-0.5" />
      <div class="min-w-0">
        <p class="text-sm font-medium">
          {{ tournament.location }}
        </p>
        <p class="text-sm text-muted">
          {{ tournament.locationAddress }}
        </p>
        <a
          v-if="tournament.locationMapsUrl"
          :href="tournament.locationMapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline"
        >
          {{ $t('location.card.openInMaps') }}
        </a>
      </div>
    </div>
  </UPageCard>
</template>
