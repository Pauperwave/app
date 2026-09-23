<!-- app\components\tournaments\single\pairing\SwissMatchCard.vue -->
<script setup lang="ts">
import type { MatchScore, SwissMatchConfirmedInfo, SwissMatchPlayer, SwissMatchReport } from '~/types'

const {
  tableNumber,
  players,
  current = null,
  report = null,
  confirmedInfo = null,
  isBye = false,
  search = ''
} = defineProps<{
  tableNumber: number
  players: SwissMatchPlayer[]
  current?: MatchScore | null
  // A Telegram-submitted result still waiting for the opponent's confirm (or
  // disputed) — shown instead of the generic "in attesa" badge while there's
  // no official result yet (2026-09-23 user request).
  report?: SwissMatchReport | null
  // Who reported/confirmed `current`, when it came from a Telegram report —
  // shown as a success badge upgrading the pre-confirm "Suggerito da" one,
  // so a player-confirmed result reads differently from one an organizer
  // entered directly (2026-09-23 user request).
  confirmedInfo?: SwissMatchConfirmedInfo | null
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
// equivalent state from `current`/`report` directly.
const isPending = computed(() => !isBye && !current)
</script>

<template>
  <UCard
    :ui="{ header: 'p-2 sm:px-3', body: 'p-2 sm:p-3 space-y-1.5' }"
    :class="isPending
      ? (report ? 'ring-info' : 'ring-warning')
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
          :report="report"
          :confirmed-info="confirmedInfo"
          @clear="emit('clear')"
        />
      </div>
    </template>

    <TournamentsSinglePairingSwissMatchPlayerRow
      v-for="player in players"
      :key="player.playerUuid"
      :player="player"
      :current="current"
      :reported="report?.status === 'pending' ? report.score : null"
      :is-bye="isBye"
      :search="search"
      @select="score => emit('select', score)"
      @toggle-drop="playerUuid => emit('toggleDrop', playerUuid)"
    />
  </UCard>
</template>
