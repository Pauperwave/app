<!-- app\components\calendar\TournamentDetailHero.vue -->
<!-- Split out of TournamentDetailContent.vue (2026-08-16 user request) — see
     EventDetailHero.vue's own header for why. -->
<script setup lang="ts">
import type { Tournament } from '~/types'

defineProps<{
  tournament: Tournament
  close: () => void
}>()
</script>

<template>
  <div class="relative overflow-hidden w-full">
    <img
      :src="tournament.image ?? DEFAULT_CALENDAR_COVER_IMAGE"
      :alt="tournament.name"
      class="w-full max-h-80 sm:max-h-96 object-cover"
    >

    <div class="absolute inset-0 bg-linear-to-b from-transparent to-default" />

    <UButton
      :icon="ICONS.close"
      color="neutral"
      variant="subtle"
      square
      class="absolute top-4 inset-e-4"
      :aria-label="$t('common.close')"
      @click="close"
    />

    <h2 class="absolute bottom-0 left-0 right-0 p-4 text-xl font-bold text-white truncate">
      {{ tournament.name }}
    </h2>
  </div>
</template>
