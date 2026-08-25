<!-- app\components\tournaments\single\PresentationCard.vue -->
<!--
  Compact tournament presentation card — cover, name, edit trigger — shown
  above the acceptance/rounds/awards/leaderboard stepper on the tournament
  detail page (user request, 2026-08-24). Reuses TournamentsListEditModal
  as-is (same modal the tournaments list/grid views already open), not a
  second edit form.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { tournament } = defineProps<{
  tournament: Tournament
}>()

const editModalOpen = ref(false)

// "sabato, 22 agosto 2026" (user request, 2026-08-24) — weekday and month
// both come out lowercase from Intl/toLocaleDateString in it-IT, matching
// normal Italian date-writing convention (no manual casing needed).
const formattedStartDate = computed(() => {
  const weekday = new Date(tournament.startDate).toLocaleDateString('it-IT', { weekday: 'long' })
  const rest = new Date(tournament.startDate).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  return `${weekday}, ${rest}`
})
</script>

<template>
  <div>
    <UCard :ui="{ body: 'flex items-center gap-4 p-3 sm:p-3' }">
      <div class="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
        <img
          v-if="tournament.image"
          :src="tournament.image"
          :alt="tournament.name"
          class="w-full h-full object-cover"
        >
        <ImageOffPlaceholder v-else class="w-full h-full" icon-class="size-6" />
      </div>

      <div class="flex-1 min-w-0">
        <h2 class="text-lg font-semibold truncate flex items-center gap-1.5">
          {{ tournament.name }}
          <TournamentsStageLabel v-if="tournament.stageNumber" :number="tournament.stageNumber" />
        </h2>
        <FormatBadge :format="tournament.format" :icon="ICONS.gameplay" />
        <p class="text-sm text-muted truncate">
          {{ formattedStartDate }}
        </p>
      </div>

      <EditIconButton
        :label="$t('tournament.single.presentationCard.edit')"
        @click="editModalOpen = true"
      />
    </UCard>

    <TournamentsListEditModal v-model="editModalOpen" :tournament="tournament" />
  </div>
</template>
