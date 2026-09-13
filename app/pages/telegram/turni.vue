<!-- app\pages\telegram\turni.vue -->
<script setup lang="ts">
// Aiuto al tavolo durante un round Pauper/Premodern (Bo3, 50 minuti): timer,
// punteggio partite del match e — a timer scaduto, al posto del timer stesso
// — contatore dei turni aggiuntivi con indicazione di chi è il turno attivo.
// Tutto stato puramente locale (nessuna persistenza/backend, nessuna
// condivisione tra i due telefoni al tavolo per ora — vedi conversazione con
// l'utente): aiuta i giocatori a tenere il conto, non alimenta risultati
// ufficiali (che oggi comunque non hanno un flusso di pairing live, vedi
// /risultato mockup). Una sola schermata, senza scroll, pensata per
// sfruttare tutto lo spazio verticale disponibile (layout telegram.vue).
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

// Il contatore turni prende il posto del timer solo dopo che è scaduto —
// timer.remaining parte da ROUND_SECONDS (mai 0) finché il countdown non
// arriva in fondo, un flag separato non serve.
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

type Player = 'me' | 'opponent'

function otherPlayer(player: Player): Player {
  return player === 'me' ? 'opponent' : 'me'
}

// Chi gioca il turno 1 dei turni aggiuntivi — impostabile dal tavolo prima
// di iniziare, poi si alterna da sé ad ogni turno successivo.
const startingPlayer = ref<Player>('me')

const TOTAL_TURNS = 5

const turn = ref(1)
const isLastTurn = computed(() => turn.value >= TOTAL_TURNS)
const activePlayer = computed<Player>(() => (
  turn.value % 2 === 1 ? startingPlayer.value : otherPlayer(startingPlayer.value)
))

function nextTurn() {
  turn.value++

  if (isLastTurn.value) {
    haptic()?.notificationOccurred('warning')
  } else {
    haptic()?.impactOccurred('medium')
  }
}

// Stub: il turno finale chiude i turni aggiuntivi invece di avanzare oltre
// TOTAL_TURNS — in futuro aprirà l'invio del punteggio del match (vedi
// /risultato, oggi anch'esso un mockup in attesa di un flusso di pairing
// live per Pauper/Premodern).
function endMatch() {
  haptic()?.notificationOccurred('success')
}

function handleTurnAction() {
  if (isLastTurn.value) {
    endMatch()
  } else {
    nextTurn()
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
  <div class="h-full w-full max-w-sm mx-auto flex flex-col gap-3 text-center">
    <section class="flex flex-col items-center gap-1.5">
      <p class="text-muted text-xs">
        Punteggio match (Bo{{ GAMES_TO_WIN_MATCH * 2 - 1 }})
      </p>

      <p class="text-3xl font-bold tabular-nums">
        {{ myGamesWon }} - {{ opponentGamesWon }}
      </p>

      <p
        v-if="matchWinner"
        class="text-primary text-xs font-medium"
      >
        {{ matchWinner === 'me' ? 'Hai vinto il match!' : 'Ha vinto l\'avversario.' }}
      </p>

      <div class="flex gap-2 w-full">
        <UButton
          size="sm"
          block
          :disabled="!!matchWinner"
          @click="winGame('me')"
        >
          Vinta da me
        </UButton>

        <UButton
          size="sm"
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
        variant="ghost"
        :icon="ICONS.rotateBack"
        @click="resetScore"
      >
        Reset punteggio
      </UButton>
    </section>

    <USeparator />

    <section class="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 w-full">
      <template v-if="!timeIsUp">
        <p class="text-muted text-sm">
          Timer del round ({{ ROUND_MINUTES }} minuti)
        </p>

        <p class="text-7xl font-bold tabular-nums">
          {{ timerLabel }}
        </p>

        <div class="flex gap-2 w-full">
          <UButton
            size="lg"
            block
            :color="timer.isActive.value ? 'warning' : 'primary'"
            @click="toggleTimer"
          >
            {{ timer.isActive.value ? 'Pausa' : 'Avvia' }}
          </UButton>

          <UButton
            size="lg"
            color="neutral"
            variant="subtle"
            :icon="ICONS.rotateBack"
            @click="resetTimer"
          />
        </div>

        <div class="flex gap-2 w-full">
          <UButton
            block
            color="error"
            variant="outline"
            @click="adjustTimer(-TIMER_ADJUST_MINUTES)"
          >
            -{{ TIMER_ADJUST_MINUTES }} min
          </UButton>

          <UButton
            block
            color="success"
            variant="outline"
            @click="adjustTimer(TIMER_ADJUST_MINUTES)"
          >
            +{{ TIMER_ADJUST_MINUTES }} min
          </UButton>
        </div>
      </template>

      <template v-else>
        <p class="text-muted text-sm">
          Turni aggiuntivi a fine tempo
        </p>

        <div class="flex gap-2">
          <UButton
            size="xs"
            :variant="startingPlayer === 'me' ? 'solid' : 'subtle'"
            @click="startingPlayer = 'me'"
          >
            Inizio io
          </UButton>

          <UButton
            size="xs"
            color="neutral"
            :variant="startingPlayer === 'opponent' ? 'solid' : 'subtle'"
            @click="startingPlayer = 'opponent'"
          >
            Inizia avversario
          </UButton>
        </div>

        <p class="text-7xl font-bold tabular-nums">
          {{ turn }}/{{ TOTAL_TURNS }}
        </p>

        <UBadge
          size="lg"
          :color="activePlayer === 'me' ? 'primary' : 'neutral'"
        >
          Turno attivo: {{ activePlayer === 'me' ? 'Io' : 'Avversario' }}
        </UBadge>

        <div class="flex gap-2 w-full">
          <UButton
            size="lg"
            block
            @click="handleTurnAction"
          >
            {{ isLastTurn ? 'Fine partita' : 'Turno successivo' }}
          </UButton>

          <UButton
            size="lg"
            color="neutral"
            variant="subtle"
            :icon="ICONS.rotateBack"
            @click="resetTurns"
          />
        </div>
      </template>
    </section>
  </div>
</template>
