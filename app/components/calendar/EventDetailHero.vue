<!-- app\components\calendar\EventDetailHero.vue -->
<!--
  Split out of EventDetailContent.vue (2026-08-16 user request) — the image/
  gradient/title hero now lives in DetailSlideover.vue's USlideover #header
  slot instead of scrolling away as the first element of #body, so it stays
  pinned while the rest of the event's details scroll underneath it. See
  TournamentDetailHero.vue for the tournament-branch counterpart.
-->
<script setup lang="ts">
import type { Event } from '~/types'

defineProps<{ event: Event }>()
</script>

<template>
  <div class="relative overflow-hidden w-full">
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
</template>
