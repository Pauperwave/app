<!-- app\components\tournaments\single\pairing\VoteGrid.vue -->
<!-- Ported bit-by-bit from MagicTheGathering/league (user request
     2026-09-16), swapping TablePlayer's numeric id for this app's uuid. -->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

const {
  label,
  weight = null,
  groupAriaLabel,
  keyPrefix,
  otherPlayers,
  selectedUuid
} = defineProps<{
  label: string
  /** Vote weight badge, shown next to `label` when the ruleset assigns one. */
  weight?: number | null
  groupAriaLabel: string
  /** Prefixes each card's :key so brew/play grids never collide on player uuid. */
  keyPrefix: string
  otherPlayers: TablePlayer[]
  selectedUuid: string | null
  /** Resolves a player's own current commander name, if any is set for this round. */
  commanderNameFor: (playerUuid: string) => string | null
}>()

const emit = defineEmits<{
  select: [player: TablePlayer, index: number]
  assign: [playerUuid: string]
}>()

const { t } = useI18n()

// Arrow-key roving tabindex — see useRovingTabindex.ts. Self-contained here
// since it's purely local UI state for this one grid.
const roving = useRovingTabindex(() => otherPlayers.length)

function selectVote(player: TablePlayer, index: number) {
  emit('select', player, index)
  roving.focusIndex(index)
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-3">
      <label class="text-md font-medium">{{ label }}</label>
      <UBadge
        v-if="weight != null"
        color="info"
        variant="subtle"
        size="md"
      >
        {{ t('tournament.single.votesModal.weightBadge', { weight }) }}
      </UBadge>
    </div>
    <div
      class="grid grid-cols-2 sm:grid-cols-3 gap-3"
      role="group"
      :aria-label="groupAriaLabel"
    >
      <TournamentsSinglePairingCommanderVoteCard
        v-for="(player, index) in otherPlayers"
        :key="`${keyPrefix}-${player.value}`"
        :ref="(el) => roving.setItemRef(index, el as { focus: () => void } | null)"
        :commander-name="commanderNameFor(player.value)"
        :name="playerNameParts(player).firstName"
        :surname="playerNameParts(player).surname"
        :player-uuid="player.value"
        :selected="selectedUuid === player.value"
        :tabindex="roving.tabindexFor(index)"
        @click="() => selectVote(player, index)"
        @assign="emit('assign', player.value)"
        @navigate="(direction) => roving.onNavigate(index, direction)"
      />
    </div>
  </div>
</template>
