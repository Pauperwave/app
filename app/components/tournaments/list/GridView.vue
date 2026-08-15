<!-- app\components\tournaments\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Tournament } from '~/types'

const { tournaments, contextMenuItems } = defineProps<{
  tournaments: Tournament[]
  contextMenuItems: (tournament: Tournament) => DropdownMenuItem[]
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
    <UContextMenu
      v-for="tournament in tournaments"
      :key="tournament.id"
      :items="contextMenuItems(tournament)"
    >
      <UCard
        class="overflow-hidden cursor-pointer hover:ring-primary transition-colors"
        :class="{ 'opacity-60 saturate-50': tournament.status === 'completed' }"
        :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
        @click="navigateTo(`/tournaments/${tournament.uuid}`)"
      >
        <!-- Luma-inspired cover, same convention as calendar/card/Base.vue: a
             real or default image up top, with the day/month tear-off badge
             overlaid on it instead of sitting beside the title — these cards
             are narrower (grid, not a full-width list), so a side-by-side
             date box would crowd the title at small widths. -->
        <div class="relative -m-3 mb-3">
          <img
            :src="tournament.image ?? DEFAULT_CALENDAR_COVER_IMAGE"
            :alt="tournament.name"
            class="w-full h-28 object-cover"
          >

          <div class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0">
            <span class="text-base font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
            <span class="text-[10px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
          </div>

          <!-- Status is shown through the card's own styling, not a badge (same
               convention as calendar/card/Base.vue): completed cards recede via
               opacity/saturation above, canceled is a strikethrough+error title
               below, ongoing gets a pulsing dot. Scheduled is the default look. -->
          <span
            v-if="tournament.status === 'in_progress'"
            class="absolute top-2 right-2 size-2.5 rounded-full bg-warning shrink-0 animate-pulse motion-reduce:animate-none"
            :title="t('tournament.status.in_progress')"
          />
        </div>

        <h3
          class="font-semibold truncate"
          :class="{ 'line-through text-error': tournament.status === 'cancelled' }"
        >
          {{ tournament.name }}
        </h3>

        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <UBadge color="neutral" variant="subtle" :icon="ICONS.gameplay">
            {{ tournament.format }}
          </UBadge>
        </div>

        <a
          v-if="tournament.location"
          :href="googleMapsUrl(tournament.locationAddress ?? tournament.location)"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-sm text-muted mt-1.5 hover:underline w-fit"
          @click.stop
        >
          <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
          <span class="truncate">{{ tournament.location }}</span>
        </a>

        <div v-if="tournament.participants.length" class="flex items-center gap-2 mt-2">
          <UAvatarGroup size="xs" :max="5">
            <UAvatar
              v-for="participant in tournament.participants"
              :key="participant"
              :src="generatePlayerAvatar(participant)"
              :alt="participant"
            />
          </UAvatarGroup>
        </div>

        <template #footer>
          <div class="flex items-center justify-between gap-2">
            <UBadge color="neutral" variant="subtle" :icon="ICONS.players">
              {{ tournament.registeredPlayers }}
            </UBadge>
            <span class="font-medium">{{ (tournament.entryFee ?? 0).toFixed(2) }} €</span>
          </div>
        </template>
      </UCard>
    </UContextMenu>
  </div>
</template>
