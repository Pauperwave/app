// app\composables\telegram\useRoundTimer.ts
const ROUND_MINUTES = 50
const ROUND_SECONDS = ROUND_MINUTES * 60

// Solo per comodità di test manuale (verificare onComplete/haptics senza
// aspettare 50 minuti reali) — non pensati per l'uso normale al tavolo.
const TIMER_ADJUST_MINUTES = 5

export function useRoundTimer() {
  const timer = useCountdown(ROUND_SECONDS, {
    onComplete: () => telegramHaptic()?.notificationOccurred('warning')
  })

  const label = computed(() => {
    const minutes = Math.floor(timer.remaining.value / 60)
    const seconds = timer.remaining.value % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  })

  // Il contatore turni prende il posto del timer solo dopo che è scaduto —
  // timer.remaining parte da ROUND_SECONDS (mai 0) finché il countdown non
  // arriva in fondo, un flag separato non serve.
  const timeIsUp = computed(() => timer.remaining.value <= 0)

  function toggle() {
    if (timer.isActive.value) {
      timer.pause()
    } else {
      timer.resume()
    }
    telegramHaptic()?.impactOccurred('light')
  }

  // Silenzioso di proposito (nessun haptic) — usato sia dal bottone di
  // reset dedicato (che aggiunge il proprio haptic) sia da useMatchScore
  // per il reset automatico a inizio partita, dove un secondo haptic
  // sovrapposto a quello già sparato per "partita vinta" sarebbe fastidioso.
  function reset() {
    timer.stop()
  }

  function adjust(deltaMinutes: number) {
    timer.remaining.value = Math.max(0, timer.remaining.value + deltaMinutes * 60)
    telegramHaptic()?.impactOccurred('light')
  }

  return {
    roundMinutes: ROUND_MINUTES,
    adjustMinutes: TIMER_ADJUST_MINUTES,
    label,
    isActive: timer.isActive,
    timeIsUp,
    toggle,
    reset,
    adjust
  }
}
