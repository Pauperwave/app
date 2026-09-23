<!-- app\components\tournaments\single\pairing\SwissMatchCard.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { MatchScore, SwissMatchConfirmedInfo, SwissMatchPlayer, SwissMatchReport } from '~/types'

const {
  tableNumber, players, current = null, report = null, confirmedInfo = null, isBye = false,
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

// A real table (not a bye) still waiting for its result.
const isPending = computed(() => !isBye && !current)

// Full name, not just the first — two players sharing a first name (e.g.
// two "Alessandro"s at different tables) would otherwise be indistinguishable
// in a badge (2026-09-23 user request).
function fullName(person: { name: string, surname?: string }): string {
  return `${person.name} ${person.surname ?? ''}`.trim()
}

// Drop is an action, not a state: the state shows next to the name as a badge.
function dropMenuItems(player: SwissMatchPlayer): DropdownMenuItem[] {
  return [{
    label: player.dropped
      ? t('tournament.single.roundManager.dropUndoLabel')
      : t('tournament.single.roundManager.dropLabel'),
    icon: ICONS.drop,
    onSelect: () => emit('toggleDrop', player.playerUuid)
  }]
}
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
        <UTooltip
          v-if="isPending && report"
          :text="t('tournament.single.roundManager.matchResultReportedScore', {
            score: `${report.score.player1GamesWon}-${report.score.player2GamesWon}`
          })"
        >
          <UBadge
            :label="report.status === 'disputed'
              ? t('tournament.single.roundManager.matchResultDisputed', {
                name: fullName(report.reporter)
              })
              : t('tournament.single.roundManager.matchResultReported', {
                name: fullName(report.reporter)
              })"
            :color="report.status === 'disputed' ? 'error' : 'info'"
            variant="subtle"
            size="md"
          />
        </UTooltip>
        <UBadge
          v-else-if="isPending"
          :label="t('tournament.single.roundManager.matchResultPending')"
          color="warning"
          variant="subtle"
          size="md"
        />
        <div v-else-if="current" class="flex items-center gap-1.5">
          <UBadge
            v-if="confirmedInfo"
            :label="t('tournament.single.roundManager.matchResultConfirmed', {
              reporter: fullName(confirmedInfo.reporter),
              confirmer: fullName(confirmedInfo.confirmer)
            })"
            color="success"
            variant="subtle"
            size="md"
          />
          <UButton
            :label="t('tournament.single.roundManager.matchResultDeleteLabel')"
            :icon="ICONS.undo"
            color="error"
            variant="outline"
            size="xs"
            @click="emit('clear')"
          />
        </div>
      </div>
    </template>

    <div
      v-for="player in players"
      :key="player.playerUuid"
      class="flex items-center justify-between gap-2"
    >
      <div class="flex items-center gap-1.5">
        <AssociateTag
          :name="player.name"
          :surname="player.surname"
          :associate-uuid="player.associateUuid"
          :highlight-query="search"
          size="md"
          :class="player.dropped && 'opacity-60 line-through'"
        />
        <UTooltip
          v-if="player.dropped"
          :text="t('tournament.single.roundManager.dropBadgeTooltip', {
            round: player.dropped.roundNumber,
            time: formatDropTime(player.dropped.droppedAt)
          })"
        >
          <UBadge
            :label="t('tournament.single.roundManager.dropBadge', {
              round: player.dropped.roundNumber
            })"
            color="warning"
            variant="subtle"
            size="sm"
          />
        </UTooltip>
      </div>

      <div class="flex items-center gap-1">
        <UBadge
          v-if="isBye"
          :label="t('tournament.single.roundManager.byeResult')"
          color="success"
          variant="subtle"
          size="lg"
        />
        <TournamentsSinglePairingSwissScoreButtons
          v-else
          :seat="player.seat"
          :current="current"
          :reported="report?.status === 'pending' ? report.score : null"
          @select="score => emit('select', score)"
        />
        <RowActionsMenu :items="dropMenuItems(player)" />
      </div>
    </div>
  </UCard>
</template>
