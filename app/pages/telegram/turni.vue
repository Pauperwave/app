<!-- app\pages\telegram\turni.vue -->
<script setup lang="ts">
// Aiuto al tavolo durante un round Pauper/Premodern (Bo3, 50 minuti): timer,
// punteggio partite del match e contatore turni aggiuntivi a fine tempo.
// Tutto stato puramente locale (nessuna persistenza/backend) — aiuta i
// giocatori a tenere il conto, non alimenta risultati ufficiali (che oggi
// comunque non hanno un flusso di pairing live, vedi /risultato mockup).
definePageMeta({ layout: 'telegram' })

function haptic() {
  return window.Telegram?.WebApp?.HapticFeedback
}

const ROUND_MINUTES = 50
const ROUND_SECONDS = ROUND_MINUTES * 60

const timer = useCountdown(ROUND_SECONDS, {
  onComplete: () => haptic()?.notificationOccurred('warning')
})

const timerLabel = computed(() => {
  const minutes = Math.floor(timer.remaining.value / 60)
  const seconds = timer.remaining.value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

function toggleTimer() {
  if (timer.isActive.value) {
    timer.pause()
  } else {
    timer.resume()
  }
  haptic()?.impactOccurred('light')
}

function resetTimer() {
  timer.stop()
  haptic()?.impactOccurred('light')
}

const GAMES_TO_WIN_MATCH = 2

const myGamesWon = ref(0)
const opponentGamesWon = ref(0)
const matchWinner = computed(() => {
  if (myGamesWon.value >= GAMES_TO_WIN_MATCH) return 'me'
  if (opponentGamesWon.value >= GAMES_TO_WIN_MATCH) return 'opponent'
  return null
})

function winGame(winner: 'me' | 'opponent') {
  if (matchWinner.value) return

  if (winner === 'me') {
    myGamesWon.value++
  } else {
    opponentGamesWon.value++
  }
  haptic()?.impactOccurred(matchWinner.value ? 'heavy' : 'medium')
}

function resetScore() {
  myGamesWon.value = 0
  opponentGamesWon.value = 0
  haptic()?.impactOccurred('light')
}

const TOTAL_TURNS = 5

const turn = ref(1)
const isLastTurn = computed(() => turn.value >= TOTAL_TURNS)

function nextTurn() {
  if (isLastTurn.value) return
  turn.value++

  if (isLastTurn.value) {
    haptic()?.notificationOccurred('warning')
  } else {
    haptic()?.impactOccurred('medium')
  }
}

function resetTurns() {
  turn.value = 1
  haptic()?.impactOccurred('light')
}

onMounted(() => {
  const webApp = window.Telegram?.WebApp
  webApp?.ready()
  webApp?.expand()
})

useHead({
  script: [{ src: 'https://telegram.org/js/telegram-web-app.js' }]
})
</script>

<template>
  <div class="flex flex-col items-center gap-10 text-center w-full max-w-xs">
    <section class="flex flex-col items-center gap-4 w-full">
      <p class="text-muted">
        Timer del round ({{ ROUND_MINUTES }} minuti)
      </p>

      <p class="text-6xl font-bold tabular-nums">
        {{ timerLabel }}
      </p>

      <div class="flex gap-3 w-full">
        <UButton
          size="xl"
          block
          :color="timer.isActive.value ? 'warning' : 'primary'"
          @click="toggleTimer"
        >
          {{ timer.isActive.value ? 'Pausa' : 'Avvia' }}
        </UButton>

        <UButton
          size="xl"
          color="neutral"
          variant="subtle"
          :icon="ICONS.rotateBack"
          @click="resetTimer"
        />
      </div>
    </section>

    <USeparator />

    <section class="flex flex-col items-center gap-4 w-full">
      <p class="text-muted">
        Punteggio match (Bo{{ GAMES_TO_WIN_MATCH * 2 - 1 }})
      </p>

      <p class="text-5xl font-bold tabular-nums">
        {{ myGamesWon }} - {{ opponentGamesWon }}
      </p>

      <p
        v-if="matchWinner"
        class="text-primary font-medium"
      >
        {{ matchWinner === 'me' ? 'Hai vinto il match!' : 'Ha vinto l\'avversario.' }}
      </p>

      <div class="flex gap-3 w-full">
        <UButton
          size="xl"
          block
          :disabled="!!matchWinner"
          @click="winGame('me')"
        >
          Vinta da me
        </UButton>

        <UButton
          size="xl"
          block
          color="neutral"
          :disabled="!!matchWinner"
          @click="winGame('opponent')"
        >
          Vinta da avversario
        </UButton>
      </div>

      <UButton
        color="neutral"
        variant="subtle"
        :icon="ICONS.rotateBack"
        @click="resetScore"
      >
        Reset punteggio
      </UButton>
    </section>

    <USeparator />

    <section class="flex flex-col items-center gap-4 w-full">
      <p class="text-muted">
        Turni aggiuntivi a fine tempo
      </p>

      <p class="text-6xl font-bold tabular-nums">
        {{ turn }}/{{ TOTAL_TURNS }}
      </p>

      <p
        v-if="isLastTurn"
        class="text-warning font-medium"
      >
        Ultimo turno
      </p>

      <div class="flex flex-col gap-3 w-full">
        <UButton
          size="xl"
          block
          :disabled="isLastTurn"
          @click="nextTurn"
        >
          Turno successivo
        </UButton>

        <UButton
          size="xl"
          block
          color="neutral"
          variant="subtle"
          @click="resetTurns"
        >
          Reset
        </UButton>
      </div>
    </section>
  </div>
</template>
