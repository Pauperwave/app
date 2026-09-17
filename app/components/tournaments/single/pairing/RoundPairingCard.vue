<!-- app\components\tournaments\single\pairing\RoundPairingCard.vue -->
<!--
  One pod's card in the round-in-progress view — ported from
  MagicTheGathering/league's TableCard.vue (in-progress variant)/
  TableCardActions.vue/PairingTableActions.vue/PairingPlayerRow.vue (user
  request, 2026-09-15/16: copy the round-view layout as-is; 2026-09-19:
  "copia 1:1 le funzionalità della card tavolo" added the reset-table/
  quick-fill/view-scores actions this file originally dropped), collapsed
  into one component instead of league's multi-file split.
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

const {
  tableNumber, players, positions, hasKills, hasVotes, hasCommander, isComplete, isDraw,
  associateUuidFor
} = defineProps<{
  tableNumber: number
  // `TablePlayer.value` here is the DB's players.uuid (player_uuid) — every
  // tournament_round_results/tournament_kills/tournament_votes/
  // commander_decks row keys by that once a round's pairings exist, unlike
  // the pre-round pairing/preview flow, where TablePlayer.value is the
  // associate uuid (AcceptancePickerItem.value) — there's no player_uuid
  // yet before start_commander_round_one creates one. `associateUuidFor`
  // resolves player_uuid -> associate uuid, just for AssociateTag's own
  // hover-popover feature.
  players: TablePlayer[]
  positions: Map<string, number>
  hasKills: boolean
  hasVotes: (playerUuid: string) => boolean
  hasCommander: (playerUuid: string) => boolean
  isComplete: boolean
  isDraw: boolean
  associateUuidFor: (playerUuid: string) => string | undefined
}>()

const emit = defineEmits<{
  openScoreModal: []
  openKillModal: []
  openVotesModal: [playerUuid: string]
  openCommanderModal: [playerUuid: string]
  openScoresModal: []
  resetTable: []
  quickFill: []
  draw: []
}>()

const { t } = useI18n()
const { isDeveloperView } = useDeveloperView()

const hasRanking = computed(() => positions.size > 0)
// Declaring a draw over already-entered data would silently discard it —
// only allowed on an empty table, or as a toggle from an existing draw.
const canToggleDraw = computed(() => isDraw || (!hasRanking.value && !hasKills))

// Rankings/kills buttons lock while the table is marked as a draw, since
// editing either would silently un-draw the table with no other signal —
// same tooltip logic as league's PairingTableActions.vue.
const rankingTooltip = computed(() => {
  if (isDraw) return t('tournament.single.roundManager.drawnTooltip')
  return hasRanking.value
    ? t('tournament.single.roundManager.rankingSetTooltip')
    : t('tournament.single.roundManager.rankingNotSetTooltip')
})
const killsTooltip = computed(() => {
  if (isDraw) return t('tournament.single.roundManager.drawnTooltip')
  return hasKills
    ? t('tournament.single.roundManager.killsSetTooltip')
    : t('tournament.single.roundManager.killsNotSetTooltip')
})
const drawTooltip = computed(() => {
  if (isDraw) return t('tournament.single.roundManager.drawUndoTooltip')
  return canToggleDraw.value
    ? t('tournament.single.roundManager.drawHint')
    : t('tournament.single.roundManager.drawDisabledTooltip')
})
</script>

<template>
  <UCard :ui="{ header: 'p-2 sm:px-3', body: 'p-2 sm:p-3', footer: 'p-2 sm:px-3' }">
    <template #header>
      <div class="flex items-center gap-2 flex-wrap @container">
        <div class="flex items-center gap-1.5">
          <UIcon :name="ICONS.tableView" class="size-4 text-primary" />
          <span class="font-semibold whitespace-nowrap">
            {{ t('tournament.single.roundManager.tableHeading', { n: tableNumber }) }}
          </span>
        </div>

        <UTooltip :text="t('tournament.single.roundManager.scoresButtonLabel')">
          <UButton
            size="xs"
            variant="outline"
            :leading-icon="ICONS.show"
            @click="emit('openScoresModal')"
          >
            <span class="hidden @sm:inline whitespace-nowrap">
              {{ t('tournament.single.roundManager.scoresButtonLabel') }}
            </span>
          </UButton>
        </UTooltip>

        <div class="flex-1" />

        <UTooltip :text="t('tournament.single.roundManager.resetTableTooltip')">
          <UButton
            size="xs"
            variant="outline"
            color="error"
            :icon="ICONS.rotateBack"
            :aria-label="t('tournament.single.roundManager.resetTableTooltip')"
            @click="emit('resetTable')"
          />
        </UTooltip>
        <UTooltip
          v-if="isDeveloperView"
          :text="t('tournament.single.roundManager.quickFillTooltip')"
        >
          <UButton
            size="xs"
            variant="outline"
            color="warning"
            :icon="ICONS.quickAction"
            :aria-label="t('tournament.single.roundManager.quickFillTooltip')"
            @click="emit('quickFill')"
          />
        </UTooltip>
        <TournamentsSinglePairingTableStateBadge :is-complete="isComplete" />
      </div>
    </template>

    <div class="space-y-1.5">
      <div
        v-for="player in players"
        :key="player.value"
        class="flex items-center gap-2 rounded bg-elevated px-2 py-1.5"
      >
        <AssociateTag
          :name="splitPlayerName(player.label).firstName"
          :surname="splitPlayerName(player.label).surname"
          :associate-uuid="associateUuidFor(player.value)"
          size="md"
          class="flex-1 truncate"
        />
        <UBadge
          v-if="positions.get(player.value)"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          #{{ positions.get(player.value) }}
        </UBadge>
        <UTooltip
          :text="hasCommander(player.value)
            ? t('tournament.single.roundManager.commanderSetTooltip')
            : t('tournament.single.roundManager.commanderNotSetTooltip')"
        >
          <UButton
            size="sm"
            variant="outline"
            :color="hasCommander(player.value) ? 'success' : 'neutral'"
            :icon="hasCommander(player.value) ? ICONS.shieldCheck : ICONS.shieldPlus"
            :aria-label="t(
              'tournament.single.roundManager.commanderAriaLabel', { name: player.label }
            )"
            @click="emit('openCommanderModal', player.value)"
          />
        </UTooltip>
        <UTooltip
          :text="hasVotes(player.value)
            ? t('tournament.single.roundManager.voteSetTooltip')
            : t('tournament.single.roundManager.voteNotSetTooltip')"
        >
          <UButton
            size="sm"
            variant="outline"
            :color="hasVotes(player.value) ? 'success' : 'neutral'"
            :icon="hasVotes(player.value) ? ICONS.confirm : ICONS.vote"
            :aria-label="t('tournament.single.roundManager.votesAriaLabel', { name: player.label })"
            @click="emit('openVotesModal', player.value)"
          />
        </UTooltip>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <UTooltip :text="rankingTooltip">
          <UButton
            class="flex-1 justify-center"
            :color="hasRanking ? 'success' : 'neutral'"
            variant="outline"
            :icon="ICONS.standings"
            :disabled="isDraw"
            :label="t('tournament.single.roundManager.rankingButton')"
            @click="emit('openScoreModal')"
          />
        </UTooltip>
        <UTooltip :text="killsTooltip">
          <UButton
            class="flex-1 justify-center"
            :color="hasKills ? 'success' : 'neutral'"
            variant="outline"
            :icon="ICONS.kills"
            :disabled="isDraw"
            :label="t('tournament.single.roundManager.killsButton')"
            @click="emit('openKillModal')"
          />
        </UTooltip>
        <UTooltip :text="drawTooltip">
          <UButton
            class="flex-1 justify-center"
            :color="isDraw ? 'success' : 'neutral'"
            variant="outline"
            :icon="ICONS.draw"
            :disabled="!canToggleDraw"
            :label="t('tournament.single.roundManager.drawButton')"
            @click="emit('draw')"
          />
        </UTooltip>
      </div>
    </template>
  </UCard>
</template>
