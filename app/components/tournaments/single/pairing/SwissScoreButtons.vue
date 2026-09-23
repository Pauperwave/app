<!-- app\components\tournaments\single\pairing\SwissScoreButtons.vue -->
<script setup lang="ts">
import type { MatchScore } from '~/types'

const { seat, current = null, reported = null } = defineProps<{
  seat: 0 | 1
  current?: MatchScore | null
  // A Telegram-submitted score still waiting for the opponent's confirm —
  // highlighted "soft"+warning (never win/loss colored) so it reads as a
  // suggestion, not `current`'s solid, win/loss-colored official result.
  reported?: MatchScore | null
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

function matches(score: MatchScore | null, outcome: { won: number, lost: number }): boolean {
  if (!score) return false
  const target = scoreFor(outcome)
  return score.player1GamesWon === target.player1GamesWon
    && score.player2GamesWon === target.player2GamesWon
}

function variantFor(outcome: { won: number, lost: number }): 'solid' | 'soft' | 'outline' {
  if (matches(current, outcome)) return 'solid'
  if (matches(reported, outcome)) return 'soft'
  return 'outline'
}

// A reported (not yet confirmed) score always reads as warning-yellow,
// regardless of who's winning — win/loss coloring is reserved for an
// actually-official result (`current`), so a suggestion never looks final.
function colorFor(outcome: { won: number, lost: number }): 'success' | 'error' | 'warning' | 'neutral' {
  if (matches(current, outcome)) return selectedColor(outcome)
  if (matches(reported, outcome)) return 'warning'
  return 'neutral'
}
</script>

<template>
  <div class="flex gap-1">
    <UButton
      v-for="outcome in OUTCOMES"
      :key="`${outcome.won}-${outcome.lost}`"
      :label="`${outcome.won}-${outcome.lost}`"
      :variant="variantFor(outcome)"
      :color="colorFor(outcome)"
      size="md"
      @click="emit('select', scoreFor(outcome))"
    />
  </div>
</template>
