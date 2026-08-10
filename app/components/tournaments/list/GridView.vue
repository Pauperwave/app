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
      :ui="{ body: 'pt-1', footer: 'p-3 sm:p-3' }"
    >
      <!-- Calendar tear-off badge: day/month instead of a plain date string, since
           these are recurring weekly events and the date is the primary thing a
           player scans for. -->
      <div class="absolute top-3 left-3 flex flex-col items-center justify-center rounded-lg bg-elevated border border-default w-14 h-14 shrink-0">
        <span class="text-lg font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
        <span class="text-xs uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
      </div>

      <UBadge
        :color="tournamentStatusColor(tournament.status)"
        variant="subtle"
        :icon="TOURNAMENT_STATUS_ICONS[tournament.status]"
        class="absolute top-3 right-3"
      >
        {{ t(`tournament.status.${tournament.status}`) }}
      </UBadge>

      <!-- pl matches the date badge's width (w-14) + gap so the title never
           overlaps it. -->
      <div class="pl-[4.75rem] min-h-14 flex flex-col justify-center gap-1">
        <h3 class="font-semibold truncate">
          {{ tournament.format }}
        </h3>
        <p class="text-sm text-muted flex items-center gap-1 truncate">
          <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
          <span class="truncate">{{ tournament.location }}</span>
        </p>
      </div>

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
