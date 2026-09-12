<!-- app\pages\telegram\turni.vue -->
<script setup lang="ts">
// Regola MTG: se il tempo scade (50 minuti) e la partita non è ancora
// finita, si gioca il turno corrente più questi 5 turni aggiuntivi — questo
// contatore serve solo a tenerne traccia al tavolo. Stato puramente locale
// (nessuna persistenza/backend): si azzera se la pagina viene chiusa o
// ricaricata, per design (vedi conversazione con l'utente).
definePageMeta({ layout: 'telegram' })

const TOTAL_TURNS = 5

const turn = ref(1)
const isLastTurn = computed(() => turn.value >= TOTAL_TURNS)

function nextTurn() {
  if (isLastTurn.value) return
  turn.value++

  const haptic = window.Telegram?.WebApp?.HapticFeedback
  if (isLastTurn.value) {
    haptic?.notificationOccurred('warning')
  } else {
    haptic?.impactOccurred('medium')
  }
}

function reset() {
  turn.value = 1
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
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
  <div class="flex flex-col items-center gap-8 text-center">
    <p class="text-muted">
      Turni aggiuntivi a fine tempo
    </p>

    <p class="text-7xl font-bold tabular-nums">
      {{ turn }}/{{ TOTAL_TURNS }}
    </p>

    <p
      v-if="isLastTurn"
      class="text-warning font-medium"
    >
      Ultimo turno
    </p>

    <div class="flex flex-col gap-3 w-full max-w-xs">
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
        @click="reset"
      >
        Reset
      </UButton>
    </div>
  </div>
</template>
