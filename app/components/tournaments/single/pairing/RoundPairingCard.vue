<!-- app\components\tournaments\single\pairing\RoundPairingCard.vue -->
<!--
  One pod's card in the round-in-progress view — ported from
  MagicTheGathering/league's TableCard.vue (in-progress variant)/
  TableCardActions.vue/PairingTableActions.vue/PairingPlayerRow.vue (user
  request, 2026-09-15/16: copy the round-view layout as-is), collapsed into
  one component instead of that 4-file split. Dropped vs. league: reset-
  table, quick test-fill, and fullscreen — dev/QA and secondary-polish
  features out of scope for this pass.
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
  draw: []
}>()

const { t } = useI18n()

const hasRanking = computed(() => positions.size > 0)
// Declaring a draw over already-entered data would silently discard it —
// only allowed on an empty table, or as a toggle from an existing draw.
const canToggleDraw = computed(() => isDraw || (!hasRanking.value && !hasKills))
</script>

<template>
  <UCard :ui="{ header: 'p-2 sm:px-3', body: 'p-2 sm:p-3', footer: 'p-2 sm:px-3' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <UIcon :name="ICONS.tableView" class="size-4 text-primary" />
          <span class="font-semibold">
            {{ t('tournament.single.roundManager.tableHeading', { n: tableNumber }) }}
          </span>
        </div>
        <UBadge
          :color="isComplete ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        >
          {{ isComplete
            ? t('tournament.single.roundManager.tableComplete')
            : t('tournament.single.roundManager.tableIncomplete') }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-1.5">
      <div
        v-for="player in players"
        :key="player.value"
        class="flex items-center gap-2 rounded-md border border-default bg-default px-2 py-1.5"
      >
        <AssociateTag
          :name="player.label"
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
        <UButton
          size="xs"
          variant="outline"
          :color="hasCommander(player.value) ? 'success' : 'neutral'"
          :icon="ICONS.commander"
          :aria-label="t(
            'tournament.single.roundManager.commanderAriaLabel', { name: player.label }
          )"
          @click="emit('openCommanderModal', player.value)"
        />
        <UButton
          size="xs"
          variant="outline"
          :color="hasVotes(player.value) ? 'success' : 'neutral'"
          :icon="ICONS.userStar"
          :aria-label="t('tournament.single.roundManager.votesAriaLabel', { name: player.label })"
          @click="emit('openVotesModal', player.value)"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          size="xs"
          class="flex-1 justify-center"
          :color="hasRanking ? 'success' : 'neutral'"
          variant="outline"
          :icon="ICONS.standings"
          :disabled="isDraw"
          :label="t('tournament.single.roundManager.rankingButton')"
          @click="emit('openScoreModal')"
        />
        <UButton
          size="xs"
          class="flex-1 justify-center"
          :color="hasKills ? 'success' : 'neutral'"
          variant="outline"
          :icon="ICONS.battle"
          :disabled="isDraw"
          :label="t('tournament.single.roundManager.killsButton')"
          @click="emit('openKillModal')"
        />
        <UButton
          size="xs"
          class="flex-1 justify-center"
          :color="isDraw ? 'success' : 'neutral'"
          variant="outline"
          :icon="ICONS.draw"
          :disabled="!canToggleDraw"
          :label="t('tournament.single.roundManager.drawButton')"
          @click="emit('draw')"
        />
      </div>
    </template>
  </UCard>
</template>
