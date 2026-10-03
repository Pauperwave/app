<!-- app\components\calendar\EventDetailHero.vue -->
<!-- Split from EventDetailContent.vue: the image/gradient/title hero lives in
     DetailSlideover.vue's USlideover #header slot, so it stays pinned while the event's details
     scroll underneath. See TournamentDetailHero.vue for the tournament-branch counterpart. -->
<script setup lang="ts">
import type { Event } from '~/types'

defineProps<{ event: Event }>()
</script>

<template>
  <div class="relative overflow-hidden rounded-t-lg w-full h-80 sm:h-96">
    <NuxtImg
      v-if="event.image"
      :src="event.image"
      :alt="event.name"
      format="webp"
      width="768"
      height="384"
      class="w-full h-full object-cover"
    />
    <ImageOffPlaceholder
      v-else
      class="w-full h-full"
      icon-class="size-12"
    />

    <div class="absolute inset-0 bg-linear-to-b from-transparent to-default" />

    <!-- No close button here (unlike TournamentDetailHero.vue): this branch has a nested "open
         a tournament" flow (see DetailSlideover.vue's openTournament), so dismissing stays
         reachable via USlideover's overlay-click/Escape, not competing with a close button in
         the same top-right corner as this share action -->
    <CalendarButtonShareButton
      :name="event.name"
      :start-date="event.startDate"
      :show-label="false"
      class="absolute top-4 inset-e-4"
    />

    <h2 class="absolute bottom-0 left-0 right-0 p-4 text-xl font-bold text-white truncate">
      {{ event.name }}
    </h2>
  </div>
</template>
