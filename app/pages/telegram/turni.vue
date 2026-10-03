<!-- app\pages\telegram\turni.vue -->
<script setup lang="ts">
// Table helper for a Pauper/Premodern round (Bo3, 50 minutes): timer, match game score and, once
// the timer runs out, the extra-turns counter in place of the timer, showing whose turn is active.
// All state is purely local (no persistence/backend, nothing shared between the two phones at the
// table for now): it helps players keep count and feeds no official results (which have no live
// pairing flow yet, see the /risultato mockup). A single screen without scroll, using all the
// vertical space available (telegram.vue layout).
//
// State and logic live in the composables in app/composables/telegram/ (one per section): this page
// only composes them and wires their events to the presentational components in
// app/components/telegram/
definePageMeta({ layout: 'telegram' })

const roundTimer = useRoundTimer()
const extraTurns = useExtraTurns()
const matchScore = useMatchScore()

function onTimerReset() {
  roundTimer.reset()
  telegramHaptic()?.impactOccurred('light')
}

// The only way back to the timer once expired: the turns section stays visible while
// roundTimer.timeIsUp is true (see v-if/v-else below), so resetting the turns must reset the timer
// too, not just the counter
function onTurnsReset() {
  extraTurns.reset()
  roundTimer.reset()
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
    <div class="landscape:hidden flex-1 min-h-0 flex flex-col gap-2">
      <TelegramMatchScoreSection
        :my-games-won="matchScore.myGamesWon.value"
        :opponent-games-won="matchScore.opponentGamesWon.value"
        :match-winner="matchScore.matchWinner.value"
        @win="matchScore.winGame"
        @reset="matchScore.reset"
      />

      <USeparator />
    </div>

    <TelegramRoundTimerSection
      v-if="!roundTimer.timeIsUp.value"
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
