<!-- app\components\tournaments\single\pairing\TournamentVotesModal.vue -->
<!--
  "Miglior mazzo" / "Miglior giocata" voting — ported bit-by-bit from
  MagicTheGathering/league's TournamentVotesModal.vue + DeckPlayVotesModal.vue
  + VoteGrid.vue + CommanderVoteCard.vue (user request 2026-09-16: "copia
  tutta la logica bit-by-bit dell'inserimento voti"), replacing this app's
  earlier single-file plain-button-grid v1. Swaps league's numeric
  player/store model for this app's uuid-keyed TablePlayer + explicit
  existingVotes/commanderNameFor props (no Pinia stores in this app).
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'
import type { RulesetPointValues } from '~/composables/tournaments/pairing/useCommanderScoring'
import type DeckPlayVotesModal from '~/components/tournaments/single/pairing/DeckPlayVotesModal.vue'

const open = defineModel<boolean>('open', { default: false })

const {
  selectedPlayer = null, otherPlayers, existingVotes, ruleset = null, commanderNameFor
} = defineProps<{
  selectedPlayer?: TablePlayer | null
  otherPlayers: TablePlayer[]
  existingVotes: { votedPlayerUuid: string, voteType: 'brew' | 'play' }[]
  ruleset?: RulesetPointValues | null
  commanderNameFor: (playerUuid: string) => string | null
}>()

const emit = defineEmits<{
  submit: [brewVotePlayerUuid: string | null, playVotePlayerUuid: string | null]
  assignCommander: [playerUuid: string]
}>()

const { t } = useI18n()

const deckVotesRef = useTemplateRef<InstanceType<typeof DeckPlayVotesModal>>('deckVotesRef')

const brewVotePlayerUuid = computed(() =>
  existingVotes.find(v => v.voteType === 'brew')?.votedPlayerUuid ?? null)
const playVotePlayerUuid = computed(() =>
  existingVotes.find(v => v.voteType === 'play')?.votedPlayerUuid ?? null)

function handleSubmit(brew: string | null, play: string | null) {
  emit('submit', brew, play)
  open.value = false
}

// UModal's own opening autofocus (Reka UI's DialogContent, usually landing
// on the close button or the first link in #description) is preempted here
// to jump straight into the dialog's own content element instead — a
// deterministic, non-flaky focus target that doesn't eat the grid's first
// tab stop. The close button is pulled out of the tab order below
// (`:close="{ tabindex: -1 }"`, still clickable and Escape still works) so
// the user's first Tab lands directly on the first vote card.
function onContentOpenAutoFocus(event: Event) {
  event.preventDefault()
  ;(event.target as HTMLElement | null)?.focus()
}

// `tabindex` isn't part of UModal's typed `close` (ButtonProps) prop, but it
// still falls through to the underlying <button> element at runtime — a
// non-literal binding sidesteps TS's excess-property check on the prop.
const closeButtonProps: Record<string, unknown> = { tabindex: -1 }
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.votesModal.title')"
    :ui="{ content: 'sm:max-w-4xl' }"
    :content="{ onOpenAutoFocus: onContentOpenAutoFocus }"
    :close="closeButtonProps"
  >
    <template #description>
      <AssociateTag
        v-if="selectedPlayer"
        :name="splitPlayerName(selectedPlayer.label).firstName"
        :surname="splitPlayerName(selectedPlayer.label).surname"
        :associate-uuid="selectedPlayer.value"
        size="xs"
      />
    </template>

    <template #body>
      <TournamentsSinglePairingDeckPlayVotesModal
        v-if="selectedPlayer"
        ref="deckVotesRef"
        :brew-vote-player-uuid="brewVotePlayerUuid"
        :play-vote-player-uuid="playVotePlayerUuid"
        :other-players="otherPlayers"
        :ruleset="ruleset"
        :commander-name-for="commanderNameFor"
        @submit="handleSubmit"
        @assign-commander="(playerUuid) => emit('assignCommander', playerUuid)"
      />
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <!-- DOM order (= tab order) is Confirm-then-Cancel — pinned back to
             its usual on-screen spot (left) via CSS `order` so this only
             changes tab order, not the visual layout. -->
        <UButton
          class="order-2"
          :label="t('common.confirm')"
          @click="deckVotesRef?.submit()"
        />
        <UButton
          class="order-1"
          color="neutral"
          variant="subtle"
          :label="t('common.cancel')"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
