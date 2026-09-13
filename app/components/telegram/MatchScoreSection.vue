<!-- app\components\telegram\MatchScoreSection.vue -->
<script setup lang="ts">
interface Props {
  gamesToWinMatch: number
  myGamesWon: number
  opponentGamesWon: number
  matchWinner: 'me' | 'opponent' | null
}

const {
  gamesToWinMatch, myGamesWon, opponentGamesWon, matchWinner
} = defineProps<Props>()

const emit = defineEmits<{
  win: [winner: 'me' | 'opponent']
  reset: []
}>()
</script>

<template>
  <section class="flex-1 min-h-0 flex flex-col items-center justify-center gap-2">
    <p class="text-muted text-sm">
      Punteggio match (Bo{{ gamesToWinMatch * 2 - 1 }})
    </p>

    <p class="text-5xl font-bold tabular-nums">
      {{ myGamesWon }} - {{ opponentGamesWon }}
    </p>

    <p
      v-if="matchWinner"
      class="text-primary text-sm font-medium"
    >
      {{ matchWinner === 'me' ? 'Hai vinto il match!' : 'Ha vinto l\'avversario.' }}
    </p>

    <div class="flex gap-2 w-full">
      <UButton
        size="lg"
        block
        :disabled="!!matchWinner"
        @click="emit('win', 'me')"
      >
        Vinta da me
      </UButton>

      <UButton
        size="lg"
        block
        color="neutral"
        :disabled="!!matchWinner"
        @click="emit('win', 'opponent')"
      >
        Vinta da avversario
      </UButton>
    </div>

    <UButton
      size="sm"
      color="neutral"
      variant="ghost"
      :icon="ICONS.rotateBack"
      @click="emit('reset')"
    >
      Reset punteggio
    </UButton>
  </section>
</template>
