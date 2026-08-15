<!-- app\components\tournaments\list\GridView.vue -->
<script setup lang="ts">
import type { Tournament } from '~/types'

const { tournaments } = defineProps<{
  tournaments: Tournament[]
}>()

const { t } = useI18n()

function dayPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit' })
}

function monthPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
}
</script>

<template>
  <div v-if="!tournaments.length" class="text-center py-12 text-muted">
    {{ $t('tournament.grid.empty') }}
  </div>

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <UCard
      v-for="tournament in tournaments"
      :key="tournament.id"
      :to="`/tournaments/${tournament.id}`"
      class="relative overflow-hidden hover:ring-primary transition-colors"
      :class="{ 'opacity-60 saturate-50': tournament.status === 'completed' }"
      :ui="{ body: 'pt-1', footer: 'p-3 sm:p-3' }"
    >
      <template #header>
        <!-- Calendar tear-off badge: day/month instead of a plain date string, since
            these are recurring weekly events and the date is the primary thing a
            player scans for. -->
        <div class="flex flex-col items-center justify-center rounded-lg bg-elevated border border-default w-14 h-14 shrink-0">
          <span class="text-lg font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
          <span class="text-xs uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
        </div>

        <!-- Status is shown through the card's own styling, not a badge (same
             convention as calendar/card/Base.vue): completed cards recede via
             opacity/saturation above, canceled is a strikethrough+error title
             below, ongoing gets a pulsing dot. Scheduled is the default look. -->
        <span
          v-if="tournament.status === 'ongoing'"
          class="size-2 rounded-full bg-warning shrink-0 animate-pulse motion-reduce:animate-none"
          :title="t('tournament.status.ongoing')"
        />
      </template>

      <span :class="{ 'line-through text-error': tournament.status === 'canceled' }">
        {{ tournament.name }}
      </span>

      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <UBadge color="neutral" variant="subtle" :icon="ICONS.players">
            {{ tournament.registeredPlayers }}
          </UBadge>
          <span class="font-medium">{{ tournament.entryFee.toFixed(2) }} €</span>
        </div>
      </template>
    </UCard>
  </div>
</template>
