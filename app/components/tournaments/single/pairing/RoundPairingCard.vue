<!-- app\components\tournaments\single\pairing\RoundPairingCard.vue -->
<!-- One pod's card in the round-in-progress view, ported from league's TableCard.vue
     (in-progress variant)/ TableCardActions.vue/PairingTableActions.vue/PairingPlayerRow.vue
     (including the reset-table/quick-fill/view-scores actions), collapsed into one component
     instead of league's multi-file split. -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { SwissDropInfo, TablePlayer } from '~/types'

const {
  tableNumber, players, positions, hasKills, noKills, hasVotes, hasCommander, isComplete, isDraw,
  associateUuidFor, droppedFor, readonly = false
} = defineProps<{
  tableNumber: number
  // `TablePlayer.value` here is the DB's players.uuid (player_uuid): every
  // tournament_round_results/tournament_kills/tournament_votes/commander_decks row keys by it once
  // a round's pairings exist, unlike the pre-round pairing/preview flow where it is the associate
  // uuid (AcceptancePickerItem.value), since no player_uuid exists before
  // start_commander_round_one. `associateUuidFor` resolves player_uuid -> associate uuid, just for
  // AssociateTag's hover popover
  players: TablePlayer[]
  positions: Map<string, number>
  hasKills: boolean
  // The organizer confirmed the table ended without any kill.
  noKills: boolean
  hasVotes: (playerUuid: string) => boolean
  hasCommander: (playerUuid: string) => boolean
  isComplete: boolean
  isDraw: boolean
  associateUuidFor: (playerUuid: string) => string | undefined
  droppedFor: (playerUuid: string) => SwissDropInfo | null
  // A closed round (a later one exists, or the tournament ended): view only, server-enforced too.
  readonly?: boolean
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
  toggleDrop: [playerUuid: string]
}>()

const { t } = useI18n()
const { isDeveloperView } = useDeveloperView()

// "Any data at all" — used only to guard the draw toggle below (declaring a
// draw over already-entered data, even partial, would silently discard it).
const hasRanking = computed(() => positions.size > 0)

function placementLabel(playerValue: string): string {
  return t('tournament.single.roundManager.placementBadge', { n: positions.get(playerValue) })
}

function placementTooltip(playerValue: string): string {
  return t('tournament.single.roundManager.placementTooltip', { n: positions.get(playerValue) })
}

// Same podium look as the round report (podiumStyle.ts).
function placementStyle(playerValue: string) {
  return podiumStyle(positions.get(playerValue) ?? 0)
}
const canToggleDraw = computed(() => isDraw || (!hasRanking.value && !hasKills))

// Some seats have data but the table isn't fully ranked yet: a common state since players
// self-report independently via the Telegram bot. Both footer icons turned green as soon as *any*
// seat had data, making one player's submission look like the whole table was done
const hasPartialData = computed(() => hasRanking.value && !isComplete)

// info (in progress, not final) rather than warning (needs attention) —
// same convention as the 1v1 flow's own "Inserito da X, in attesa" badge:
// blue for "something happened but isn't settled yet", not yellow.
const rankingColor = computed(() => {
  if (isComplete) return 'success' as const
  return hasRanking.value ? 'info' as const : 'neutral' as const
})
// Kills piggyback on the same "is the table fully ranked" gate since a kill
// count alone can't tell a genuinely-zero-kills table apart from one
// nobody has touched yet.
const killsColor = computed(() => {
  if (noKills) return 'success' as const
  if (!hasKills) return 'neutral' as const
  return isComplete ? 'success' as const : 'info' as const
})

// Rankings/kills buttons lock while the table is marked as a draw, since editing either would
// silently un-draw it with no other signal (like league's PairingTableActions.vue tooltip logic)
const rankingTooltip = computed(() => {
  if (isDraw) return t('tournament.single.roundManager.drawnTooltip')
  if (isComplete) return t('tournament.single.roundManager.rankingSetTooltip')
  return hasPartialData.value
    ? t('tournament.single.roundManager.rankingPartialTooltip')
    : t('tournament.single.roundManager.rankingNotSetTooltip')
})
const killsTooltip = computed(() => {
  if (isDraw) return t('tournament.single.roundManager.drawnTooltip')
  if (noKills) return t('tournament.single.roundManager.killsNoneTooltip')
  if (!hasKills) return t('tournament.single.roundManager.killsNotSetTooltip')
  return isComplete
    ? t('tournament.single.roundManager.killsSetTooltip')
    : t('tournament.single.roundManager.killsPartialTooltip')
})
// Drop is an action, not a state (the state shows as a badge next to the name). Dropping is
// offered once the table is ranked; undoing a drop is always possible.
function dropMenuItemsFor(playerUuid: string): DropdownMenuItem[] {
  const dropped = droppedFor(playerUuid)
  return [{
    label: dropped
      ? t('tournament.single.roundManager.dropUndoLabel')
      : t('tournament.single.roundManager.dropLabel'),
    icon: ICONS.drop,
    disabled: !dropped && !isComplete,
    onSelect: () => emit('toggleDrop', playerUuid)
  }]
}

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

        <UTooltip v-if="!readonly" :text="t('tournament.single.roundManager.resetTableTooltip')">
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
          v-if="isDeveloperView && !readonly"
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
      <!-- Same player card as TableSeatItem.vue: the seat number is the ticket stub. -->
      <div
        v-for="(player, playerIndex) in players"
        :key="player.value"
        class="flex min-h-11 items-stretch overflow-hidden rounded-lg bg-default ring ring-default transition hover:ring-primary/40"
      >
        <!-- players come in player1..player4 order, i.e. seat order -->
        <UTooltip :text="t('tournament.single.tablePreview.seatTooltip', { n: playerIndex + 1 })">
          <span
            class="flex w-8 shrink-0 items-center justify-center border-e border-dashed border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary tabular-nums"
            :aria-label="t('tournament.single.tablePreview.seatTooltip', { n: playerIndex + 1 })"
          >
            {{ playerIndex + 1 }}
          </span>
        </UTooltip>

        <div class="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1">
          <AssociateTag
            :name="playerNameParts(player).firstName"
            :surname="playerNameParts(player).surname"
            :associate-uuid="associateUuidFor(player.value)"
            size="md"
            class="min-w-0 break-words"
            :class="droppedFor(player.value) && 'opacity-60 line-through'"
          />
          <TelegramStatusIcon :associate-uuid="associateUuidFor(player.value)" />
        </div>

        <div class="flex shrink-0 items-center gap-1.5 pe-1.5">
          <TournamentsSinglePairingDropBadge :dropped="droppedFor(player.value)" with-time />
          <!-- Medal + "1°", so the placement can't be mistaken for the seat number on the left. -->
          <UTooltip
            v-if="positions.get(player.value)"
            :text="placementTooltip(player.value)"
          >
            <UBadge
              :label="placementLabel(player.value)"
              :icon="placementStyle(player.value).icon"
              color="neutral"
              variant="subtle"
              size="md"
              :class="['h-7', placementStyle(player.value).badgeClass]"
            />
          </UTooltip>
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
              :disabled="readonly"
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
              :aria-label="t(
                'tournament.single.roundManager.votesAriaLabel', { name: player.label }
              )"
              :disabled="readonly"
              @click="emit('openVotesModal', player.value)"
            />
          </UTooltip>
          <RowActionsMenu v-if="!readonly" :items="dropMenuItemsFor(player.value)" />
        </div>
      </div>
    </div>

    <template v-if="!readonly" #footer>
      <div class="flex gap-2">
        <UTooltip :text="rankingTooltip">
          <UButton
            class="flex-1 justify-center"
            :color="rankingColor"
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
            :color="killsColor"
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
