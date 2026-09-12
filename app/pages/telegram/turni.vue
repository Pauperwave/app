<!-- app\pages\telegram\turni.vue -->
<script setup lang="ts">
// Aiuto al tavolo durante un round Pauper/Premodern (Bo3, 50 minuti): timer,
// punteggio partite del match e contatore turni aggiuntivi a fine tempo (il
// contatore turni compare solo a timer scaduto — prima non serve). Tutto
// stato puramente locale (nessuna persistenza/backend) — aiuta i giocatori a
// tenere il conto, non alimenta risultati ufficiali (che oggi comunque non
// hanno un flusso di pairing live, vedi /risultato mockup). Una sola
// schermata, senza scroll (layout telegram.vue è h-screen overflow-hidden).
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

// Il contatore turni serve solo dopo che il timer è scaduto — timer.remaining
// parte da ROUND_SECONDS (mai 0) finché il countdown non arriva in fondo, un
// flag separato non serve.
const timeIsUp = computed(() => timer.remaining.value <= 0)

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

// Solo per comodità di test manuale (verificare onComplete/haptics senza
// aspettare 50 minuti reali) — non pensati per l'uso normale al tavolo.
const TIMER_ADJUST_MINUTES = 5

function adjustTimer(deltaMinutes: number) {
  timer.remaining.value = Math.max(0, timer.remaining.value + deltaMinutes * 60)
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
  <div class="flex flex-col items-center justify-center gap-3 text-center w-full max-w-xs h-full">
    <section class="flex flex-col items-center gap-1.5 w-full">
      <p class="text-muted text-xs">
        Timer del round ({{ ROUND_MINUTES }} minuti)
      </p>

      <p class="text-4xl font-bold tabular-nums">
        {{ timerLabel }}
      </p>

      <div class="flex gap-2 w-full">
        <UButton
          block
          :color="timer.isActive.value ? 'warning' : 'primary'"
          @click="toggleTimer"
        >
          {{ timer.isActive.value ? 'Pausa' : 'Avvia' }}
        </UButton>

        <UButton
          color="neutral"
          variant="subtle"
          :icon="ICONS.rotateBack"
          @click="resetTimer"
        />
      </div>

      <div class="flex gap-2 w-full">
        <UButton
          size="xs"
          block
          color="neutral"
          variant="ghost"
          @click="adjustTimer(-TIMER_ADJUST_MINUTES)"
        >
          -{{ TIMER_ADJUST_MINUTES }} min
        </UButton>

        <UButton
          size="xs"
          block
          color="neutral"
          variant="ghost"
          @click="adjustTimer(TIMER_ADJUST_MINUTES)"
        >
          +{{ TIMER_ADJUST_MINUTES }} min
        </UButton>
      </div>
    </section>

    <USeparator />

    <section class="flex flex-col items-center gap-1.5 w-full">
      <p class="text-muted text-xs">
        Punteggio match (Bo{{ GAMES_TO_WIN_MATCH * 2 - 1 }})
      </p>

      <p class="text-3xl font-bold tabular-nums">
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
          block
          :disabled="!!matchWinner"
          @click="winGame('me')"
        >
          Vinta da me
        </UButton>

        <UButton
          block
          color="neutral"
          :disabled="!!matchWinner"
          @click="winGame('opponent')"
        >
          Vinta da avversario
        </UButton>
      </div>

      <UButton
        size="xs"
        color="neutral"
        variant="subtle"
        :icon="ICONS.rotateBack"
        @click="resetScore"
      >
        Reset punteggio
      </UButton>
    </section>

    <template v-if="timeIsUp">
      <USeparator />

      <section class="flex flex-col items-center gap-1.5 w-full">
        <p class="text-muted text-xs">
          Turni aggiuntivi a fine tempo
        </p>

        <p class="text-4xl font-bold tabular-nums">
          {{ turn }}/{{ TOTAL_TURNS }}
        </p>

        <p
          v-if="isLastTurn"
          class="text-warning text-sm font-medium"
        >
          Ultimo turno
        </p>

        <div class="flex gap-2 w-full">
          <UButton
            block
            :disabled="isLastTurn"
            @click="nextTurn"
          >
            Turno successivo
          </UButton>

          <UButton
            color="neutral"
            variant="subtle"
            :icon="ICONS.rotateBack"
            @click="resetTurns"
          />
        </div>
      </section>
    </template>
  </div>
</template>
