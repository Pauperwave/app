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
//
// Stato e logica vivono nei composable in app/composables/telegram/ (uno
// per sezione) — questa pagina si limita a comporli e a collegare i loro
// eventi ai rispettivi componenti presentazionali in app/components/telegram/.
definePageMeta({ layout: 'telegram' })

const roundTimer = useRoundTimer()
const extraTurns = useExtraTurns()
const matchScore = useMatchScore()

function onTimerReset() {
  roundTimer.reset()
  telegramHaptic()?.impactOccurred('light')
}

function onTurnsReset() {
  extraTurns.reset()
  telegramHaptic()?.impactOccurred('light')
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
  <div class="h-full w-full flex flex-col gap-2 text-center">
    <TelegramMatchScoreSection
      :games-to-win-match="matchScore.gamesToWinMatch"
      :my-games-won="matchScore.myGamesWon.value"
      :opponent-games-won="matchScore.opponentGamesWon.value"
      :match-winner="matchScore.matchWinner.value"
      @win="matchScore.winGame"
      @reset="matchScore.reset"
    />

    <USeparator />

    <TelegramRoundTimerSection
      v-if="!roundTimer.timeIsUp.value"
      :round-minutes="roundTimer.roundMinutes"
      :label="roundTimer.label.value"
      :is-active="roundTimer.isActive.value"
      :adjust-minutes="roundTimer.adjustMinutes"
      @toggle="roundTimer.toggle"
      @reset="onTimerReset"
      @adjust="roundTimer.adjust"
    />

    <TelegramExtraTurnsSection
      v-else
      :turn="extraTurns.turn.value"
      :total-turns="extraTurns.totalTurns"
      :is-last-turn="extraTurns.isLastTurn.value"
      :active-player="extraTurns.activePlayer.value"
      :turns-by-player="extraTurns.turnsByPlayer.value"
      :starting-player="extraTurns.startingPlayer.value"
      @set-starting-player="extraTurns.setStartingPlayer"
      @action="extraTurns.action"
      @reset="onTurnsReset"
    />
  </div>
</template>
