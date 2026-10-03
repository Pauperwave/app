// app\composables\telegram\useRoundTimer.ts
const ROUND_MINUTES = 50
const ROUND_SECONDS = ROUND_MINUTES * 60

// For manual testing only (checking onComplete/haptics without waiting 50 real minutes), not meant
// for normal use at the table
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

  // The turn counter replaces the timer only once it has expired: timer.remaining starts at
  // ROUND_SECONDS (never 0) until the countdown ends, so no separate flag is needed
  const timeIsUp = computed(() => timer.remaining.value <= 0)

  function toggle() {
    if (timer.isActive.value) {
      timer.pause()
    } else {
      timer.resume()
    }
    telegramHaptic()?.impactOccurred('light')
  }

  // Silent on purpose (no haptic): the callers (the page's reset buttons) add their own
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
