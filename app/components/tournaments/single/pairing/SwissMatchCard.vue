<!-- app\components\tournaments\single\pairing\SwissMatchCard.vue -->
<script setup lang="ts">
import type { MatchScore, SwissMatchPlayer, SwissMatchTelegramInfo } from '~/types'

const {
  tableNumber,
  players,
  current = null,
  telegramInfo = null,
  isBye = false,
  search = ''
} = defineProps<{
  tableNumber: number
  players: SwissMatchPlayer[]
  current?: MatchScore | null
  // Who reported `current` via Telegram and whether the opponent answered —
  // shown as the header badge (info/success/error), instead of looking
  // identical to a result an organizer entered directly (2026-09-23/24 user
  // request).
  telegramInfo?: SwissMatchTelegramInfo | null
  // A single player sitting out: scores as a 2-0 win, nothing to enter.
  isBye?: boolean
  search?: string
}>()

const emit = defineEmits<{
  select: [score: MatchScore]
  clear: []
  toggleDrop: [playerUuid: string]
}>()

const { t } = useI18n()

// A real table (not a bye) still waiting for its result — only used here
// for the card's own ring color; SwissMatchResultBadge.vue derives its own
// equivalent state from `current` directly.
const isPending = computed(() => !isBye && !current)
</script>

<template>
  <UCard
    :ui="{ header: 'p-2 sm:px-3', body: 'p-2 sm:p-3 space-y-1.5' }"
    :class="isPending
      ? 'ring-warning'
      : current && 'opacity-75 transition-opacity hover:opacity-100'"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium">
          {{ isBye
            ? t('tournament.single.roundManager.byeTitle')
            : t('tournament.single.swissTablePreview.tableNumber', { n: tableNumber }) }}
        </span>
        <TournamentsSinglePairingSwissMatchResultBadge
          v-if="!isBye"
          :current="current"
          :telegram-info="telegramInfo"
          @clear="emit('clear')"
        />
      </div>
    </template>

    <TournamentsSinglePairingSwissMatchPlayerRow
      v-for="player in players"
      :key="player.playerUuid"
      :player="player"
      :current="current"
      :is-bye="isBye"
      :search="search"
      @select="score => emit('select', score)"
      @toggle-drop="playerUuid => emit('toggleDrop', playerUuid)"
    />
  </UCard>
</template>
