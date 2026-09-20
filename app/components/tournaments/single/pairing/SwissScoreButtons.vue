<!-- app\components\tournaments\single\pairing\SwissScoreButtons.vue -->
<script setup lang="ts">
import type { MatchScore } from '~/types'

const { seat, current = null } = defineProps<{
  seat: 0 | 1
  current?: MatchScore | null
}>()

const emit = defineEmits<{
  select: [score: MatchScore]
}>()

// Every outcome from this seat's own point of view (its games won first), so a
// selected result lights up on both seats: green for the winner, red for the loser.
const OUTCOMES = [
  { won: 2, lost: 0 },
  { won: 2, lost: 1 },
  { won: 1, lost: 1 },
  { won: 1, lost: 2 },
  { won: 0, lost: 2 }
]

function scoreFor(outcome: { won: number, lost: number }): MatchScore {
  return seat === 0
    ? { player1GamesWon: outcome.won, player2GamesWon: outcome.lost }
    : { player1GamesWon: outcome.lost, player2GamesWon: outcome.won }
}

function selectedColor(outcome: { won: number, lost: number }): 'success' | 'error' | 'neutral' {
  if (outcome.won > outcome.lost) return 'success'
  if (outcome.won < outcome.lost) return 'error'
  return 'neutral'
}

function isCurrent(outcome: { won: number, lost: number }): boolean {
  const score = scoreFor(outcome)
  return current?.player1GamesWon === score.player1GamesWon
    && current?.player2GamesWon === score.player2GamesWon
}
</script>

<template>
  <div class="flex gap-1">
    <UButton
      v-for="outcome in OUTCOMES"
      :key="`${outcome.won}-${outcome.lost}`"
      :label="`${outcome.won}-${outcome.lost}`"
      :variant="isCurrent(outcome) ? 'solid' : 'outline'"
      :color="isCurrent(outcome) ? selectedColor(outcome) : 'neutral'"
      size="md"
      @click="emit('select', scoreFor(outcome))"
    />
  </div>
</template>
