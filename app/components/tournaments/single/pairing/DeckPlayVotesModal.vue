<!-- app\components\tournaments\single\pairing\DeckPlayVotesModal.vue -->
<!--
  Ported bit-by-bit from MagicTheGathering/league's DeckPlayVotesModal.vue
  (user request 2026-09-16) — kept the same component name even though this
  app's first vote category is "brew" (Miglior mazzo) rather than league's
  "deck", since the two mean the same thing and the component itself is
  otherwise unchanged. Swaps numeric player ids for this app's uuids and
  Ruleset's rule_set_brew/rule_set_play columns for RulesetPointValues'
  brew/play.
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'
import type { RulesetPointValues } from '~/composables/tournaments/useCommanderScoring'

const props = defineProps<{
  brewVotePlayerUuid: string | null
  playVotePlayerUuid: string | null
  otherPlayers: TablePlayer[]
  ruleset?: RulesetPointValues | null
  commanderNameFor: (playerUuid: string) => string | null
}>()

const emit = defineEmits<{
  submit: [brewVotePlayerUuid: string | null, playVotePlayerUuid: string | null]
  /** A voted-on player has no commander recorded yet — opens the commander-assignment modal for them. */
  assignCommander: [playerUuid: string]
}>()

const { t } = useI18n()

const localBrewVotePlayerUuid = ref(props.brewVotePlayerUuid)
const localPlayVotePlayerUuid = ref(props.playVotePlayerUuid)

watch(
  [() => props.brewVotePlayerUuid, () => props.playVotePlayerUuid],
  ([brew, play]) => {
    localBrewVotePlayerUuid.value = brew
    localPlayVotePlayerUuid.value = play
  }
)

function handleConfirm() {
  emit('submit', localBrewVotePlayerUuid.value, localPlayVotePlayerUuid.value)
}

function onAssignCommander(playerUuid: string) {
  emit('assignCommander', playerUuid)
}

// Footer lives in the parent (TournamentVotesModal's #footer slot) — this
// lets the confirm button sit in UModal's actual footer instead of at the
// end of the body content.
defineExpose({ submit: handleConfirm })
</script>

<template>
  <div class="space-y-6">
    <TournamentsSinglePairingVoteGrid
      :label="t('tournament.single.votesModal.brewLabel')"
      :weight="ruleset?.brew ?? null"
      :group-aria-label="t('tournament.single.votesModal.brewLabel')"
      key-prefix="brew"
      :other-players="otherPlayers"
      :selected-uuid="localBrewVotePlayerUuid"
      :commander-name-for="commanderNameFor"
      @select="(player) => localBrewVotePlayerUuid = player.value"
      @assign="onAssignCommander"
    />
    <TournamentsSinglePairingVoteGrid
      :label="t('tournament.single.votesModal.playLabel')"
      :weight="ruleset?.play ?? null"
      :group-aria-label="t('tournament.single.votesModal.playLabel')"
      key-prefix="play"
      :other-players="otherPlayers"
      :selected-uuid="localPlayVotePlayerUuid"
      :commander-name-for="commanderNameFor"
      @select="(player) => localPlayVotePlayerUuid = player.value"
      @assign="onAssignCommander"
    />
  </div>
</template>
