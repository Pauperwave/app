<!-- app\components\tournaments\single\pairing\VotesModal.vue -->
<!--
  "Miglior mazzo" / "Miglior giocata" voting — ported from
  MagicTheGathering/league's TournamentVotesModal.vue/DeckPlayVotesModal.vue/
  VoteGrid.vue (user request, 2026-09-15/16: copy the vote logic as-is),
  collapsed into one self-contained component instead of that 3-file split
  (VoteGrid/CommanderVoteCard's roving-tabindex + "assign commander from
  the vote card" shortcut dropped for this pass — a plain grid of buttons
  is enough for a v1). One brew vote + one play vote per voter per pairing
  — league's *current* code single-selects each (not the older "up to 2
  play votes" some docs describe); the BFF replaces any prior vote of that
  type for this voter/pairing before inserting the new one, since a plain
  vote is single-select per category but the DB's own unique constraint
  only blocks an exact duplicate.
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

const open = defineModel<boolean>('open', { default: false })

const { otherPlayers, existingVotes } = defineProps<{
  otherPlayers: TablePlayer[]
  existingVotes: { votedPlayerUuid: string, voteType: 'brew' | 'play' }[]
}>()

const emit = defineEmits<{
  submit: [brewVotePlayerUuid: string | null, playVotePlayerUuid: string | null]
}>()

const { t } = useI18n()

const brewVote = ref<string | null>(null)
const playVote = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  brewVote.value = existingVotes.find(v => v.voteType === 'brew')?.votedPlayerUuid ?? null
  playVote.value = existingVotes.find(v => v.voteType === 'play')?.votedPlayerUuid ?? null
}, { immediate: true })

function selectionFor(category: 'brew' | 'play') {
  return category === 'brew' ? brewVote : playVote
}

function toggle(category: 'brew' | 'play', playerValue: string) {
  const selection = selectionFor(category)
  selection.value = selection.value === playerValue ? null : playerValue
}

function handleSubmit() {
  emit('submit', brewVote.value, playVote.value)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.votesModal.title')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-6">
        <div v-for="category in (['brew', 'play'] as const)" :key="category">
          <p class="text-sm font-medium mb-2">
            {{ category === 'brew'
              ? t('tournament.single.votesModal.brewLabel')
              : t('tournament.single.votesModal.playLabel') }}
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <UButton
              v-for="player in otherPlayers"
              :key="`${category}-${player.value}`"
              :label="player.label"
              :color="selectionFor(category).value === player.value ? 'primary' : 'neutral'"
              :variant="selectionFor(category).value === player.value ? 'solid' : 'outline'"
              class="justify-center"
              @click="toggle(category, player.value)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton :label="t('common.confirm')" @click="handleSubmit" />
    </template>
  </UModal>
</template>
