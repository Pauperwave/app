<!-- app\pages\telegram\turni.vue -->
<script setup lang="ts">
// Table helper for a round: the round timer and, once it runs out, the extra-turns counter in
// place of the timer, showing whose turn is active. Opened by a player sitting at a live table,
// it follows the event's own timer (read-only, see useEventTimer.ts); otherwise it falls back to
// a local 50-minute timer with its own controls. The turns counter is always local and feeds no
// official results. A single screen without scroll, using all the vertical space available
// (telegram.vue layout).
//
// State and logic live in the composables in app/composables/telegram/ (one per section): this page
// only composes them and wires their events to the presentational components in
// app/components/telegram/
definePageMeta({ layout: 'telegram' })

const eventTimer = useEventTimer()
const roundTimer = useRoundTimer()
const extraTurns = useExtraTurns()

// The event timer has no extra-turns screen of its own before its turns phase starts
const eventTimeIsUp = computed(() => {
  const phase = eventTimer.resolved.value?.phase
  return phase === 'turns' || phase === 'ended'
})
const eventCaption = computed(() => {
  const timer = eventTimer.resolved.value
  const phase = timer?.phase === 'pre' ? 'Preparazione' : 'Round'
  return `${phase} — segue il timer dell'evento${timer?.isRunning ? '' : ' (in pausa)'}`
})

function onTimerReset() {
  roundTimer.reset()
  telegramHaptic()?.impactOccurred('light')
}

// The only way back to the timer once expired: the turns section stays visible while
// roundTimer.timeIsUp is true (see v-if/v-else below), so resetting the turns must reset the timer
// too, not just the counter
function onTurnsReset() {
  extraTurns.reset()
  if (!eventTimer.isSynced.value) roundTimer.reset()
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
    <template v-if="eventTimer.isLoading.value" />

    <TelegramRoundTimerSection
      v-else-if="eventTimer.isSynced.value && !eventTimeIsUp"
      :label="eventTimer.label.value"
      :caption="eventCaption"
      readonly
    />

    <TelegramRoundTimerSection
      v-else-if="!eventTimer.isSynced.value && !roundTimer.timeIsUp.value"
      caption="Timer locale, non collegato a un evento"
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
