// app\composables\tournaments\rounds\useRoundTimerEngine.ts
// The countdown state machine behind RoundTimer.vue: phase state, persistence, interval ticking and
// every action that changes the phase or its remaining time (split from the component's
// fullscreen/confirm-dialog/template concerns).
export type RoundTimerPhase = 'pre' | 'round' | 'turns' | 'ended'

const TURNS_TIMER_MINUTES = 15
// Fallback only for the window before useSettingsQuery.ts resolves (the "pre" phase length comes
// from /settings' Timer section)
const DEFAULT_PRE_TIMER_MINUTES = 3

export function useRoundTimerEngine(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  round: number
  durationMinutes: MaybeRefOrGetter<number>
  /** Fired once when the "round" phase ends and "turni" begins. */
  onExpired: () => void
}) {
  const { t } = useI18n()
  const { play, playLoop, stopLoop } = useSoundEffects()

  const settings = useSettingsQuery()
  const preTimerMinutes = computed(
    () => settings.data.value?.preRoundWaitMinutes ?? DEFAULT_PRE_TIMER_MINUTES
  )

  // Once the final phase expires the alarm repeats until any key is pressed: a single chime is easy
  // to miss
  useEventListener(window, 'keydown', stopLoop)
  // The loop is a module-scope singleton (useSoundEffects.ts), so it would keep blaring after a
  // navigation unmounts this
  onUnmounted(stopLoop)

  /** Which of the 3 phases (or the terminal "ended" state) is currently active. */
  const phase = useLocalStorage<RoundTimerPhase>(`round-timer-phase-${options.round}`, 'pre')

  /**
   * The Unix timestamp (ms) at which the *current phase* was last started or resumed. Persisted to
   * localStorage so a refresh restores the running state. Null before the first start and once
   * "ended". /
   */
  const startTime = useLocalStorage<number | null>(`round-timer-start-${options.round}`, null)

  /** Seconds elapsed in the current phase, accounting for pauses. */
  const elapsed = ref(0)

  /** Whether the interval is currently ticking. */
  const isRunning = ref(false)

  /** Extra minutes added to the "round" phase only (e.g. time extensions). */
  const timeBonus = useLocalStorage<number>(`round-timer-bonus-${options.round}`, 0)

  /**
   * This phase's total duration in minutes (fixed for pre/turns, configurable + bonus for round).
   */
  const phaseDurationMinutes = computed(() => {
    if (phase.value === 'pre') return preTimerMinutes.value
    if (phase.value === 'turns') return TURNS_TIMER_MINUTES
    if (phase.value === 'round') return toValue(options.durationMinutes)
    return 0
  })

  /** Bonus minutes only apply to the "round" phase. */
  const phaseBonusMinutes = computed(() => phase.value === 'round' ? timeBonus.value : 0)

  /** Total duration in seconds for the current phase (base + any added time). */
  const totalSeconds = computed(() =>
    calculateTotalSeconds(phaseDurationMinutes.value, phaseBonusMinutes.value)
  )

  /** Seconds remaining, clamped to [0, totalSeconds]. */
  const remaining = computed(() => calculateRemainingSeconds(totalSeconds.value, elapsed.value))

  /** True once the current phase's countdown hits zero (never true once "ended"). */
  const isExpired = computed(() => phase.value !== 'ended' && isTimerExpired(remaining.value))

  /** True once started at least once and currently paused (not fresh, expired or ended). */
  const isPaused = computed(() => phase.value !== 'ended'
    && isTimerPaused(isRunning.value, startTime.value !== null, isExpired.value))

  /** Human-readable MM:SS string for the remaining time in the current phase. */
  const display = computed(() => formatDuration(remaining.value))

  /** Phase label shown right of the timer icon (one per phase, "ended" included). */
  const phaseLabel = computed(() => t(`tournament.single.roundTimer.phases.${phase.value}`))

  /**
   * Phase label color matching its urgency (yellow get-ready/turns, green active play, red game
   * over).
   */
  const phaseLabelColorClass = computed(() => {
    if (phase.value === 'round') return 'text-success'
    if (phase.value === 'ended') return 'text-error'
    return 'text-warning'
  })

  /**
   * Advances through phase boundaries while the current phase's elapsed time has caught up to its
   * duration. A plain `if` would handle one boundary per tick, but a page closed through a whole
   * phase (or more) must cascade through all of them, each carrying its overflow into the next
   * phase's elapsed time. Called from the live tick and onMounted's catch-up, so a long absence
   * behaves like watching live. /
   */
  function advancePastExpiry() {
    while (phase.value !== 'ended' && elapsed.value >= totalSeconds.value) {
      const overflow = elapsed.value - totalSeconds.value

      if (phase.value === 'pre') {
        play('notification')
        phase.value = 'round'
      } else if (phase.value === 'round') {
        play('warning')
        options.onExpired()
        phase.value = 'turns'
      } else {
        phase.value = 'ended'
        startTime.value = null
        elapsed.value = 0
        isRunning.value = false
        playLoop('warning')
        return
      }

      startTime.value = Date.now() - overflow * 1000
      elapsed.value = overflow
    }
  }

  /**
   * Lets the organizer skip from "pre" (SISTEMATEVI) to "round" (GIOCO) once everyone is seated,
   * instead of waiting out settings.timer.fields.preRoundWaitMinutes. No overflow to carry: the
   * phase ends early and elapsed resets to 0. Keeps whatever running/paused state "pre" was in,
   * rather than auto-starting the round. /
   */
  function skipPreTimer() {
    if (phase.value !== 'pre') return
    play('notification')
    phase.value = 'round'
    elapsed.value = 0
    startTime.value = isRunning.value ? Date.now() : null
  }

  const { pause, resume } = useIntervalFn(() => {
    // startTime is null once "ended" (see advancePastExpiry), so this also skips ticks after the
    // sequence is over
    if (!startTime.value) return

    elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)

    if (elapsed.value >= totalSeconds.value) {
      advancePastExpiry()
      if (phase.value === 'ended') pause()
    }
  }, 1000, { immediate: false })

  /**
   * Start or resume the timer, back-calculating the start time from elapsed so paused time is
   * excluded.
   */
  function start() {
    startTime.value = calculateResumeStartTime(Date.now(), elapsed.value)
    isRunning.value = true
    resume()
    play('play')
  }

  /** Pause the timer, preserving elapsed time for a later resume. */
  function stop() {
    pause()
    isRunning.value = false
    play('pause')
  }

  /** Stop the timer and reset the whole pre/round/turni sequence to "pre". */
  function reset() {
    pause()
    phase.value = 'pre'
    startTime.value = null
    elapsed.value = 0
    isRunning.value = false
    timeBonus.value = 0
    stopLoop()
    play('undo')
  }

  /**
   * Lets the organizer end TURNI right now (straight to FINE PARTITA) instead of waiting out the
   * remaining 15 minutes: the same effect as TURNI expiring (advancePastExpiry's last branch), so
   * the interval is paused here explicitly. /
   */
  function forceEndTurns() {
    if (phase.value !== 'turns') return
    pause()
    phase.value = 'ended'
    startTime.value = null
    elapsed.value = 0
    isRunning.value = false
    playLoop('warning')
  }

  /** Add extra minutes to the "round" phase; if it had expired, restarts it from the added time. */
  function addMinutes(minutes: number) {
    const wasExpired = isExpired.value
    timeBonus.value += minutes
    if (wasExpired) {
      elapsed.value = 0
      startTime.value = null
      isRunning.value = false
      stopLoop()
    }
    play('select')
  }

  /** Remove minutes from the "round" phase, floored so its total duration never goes below zero. */
  function subtractMinutes(minutes: number) {
    timeBonus.value = clampSubtractedBonus(
      timeBonus.value, minutes, toValue(options.durationMinutes)
    )
    play('deselect')
  }

  /**
   * Whether subtracting this many minutes would immediately expire the round (RoundTimer.vue gates
   * a confirm on it).
   */
  function wouldExpireOnSubtract(minutes: number): boolean {
    return wouldSubtractExpireTimer(
      elapsed.value, timeBonus.value, minutes, toValue(options.durationMinutes)
    )
  }

  // Publishes the timer after every change of what the clock shows (not on every tick), so the
  // Telegram turns Mini App can follow the event clock. Only changes publish, never the mount
  // itself: a second device opened on a fresh timer must not overwrite one that is running.
  // Fire-and-forget: the timer works the same if the request fails.
  watch([phase, isRunning, timeBonus], () => {
    $fetch('/api/tournament-rounds/timer', {
      method: 'POST',
      body: {
        tournamentUuid: toValue(options.tournamentUuid),
        roundNumber: options.round,
        phase: phase.value,
        isRunning: isRunning.value,
        elapsedSeconds: elapsed.value,
        preSeconds: preTimerMinutes.value * 60,
        roundSeconds: calculateTotalSeconds(toValue(options.durationMinutes), timeBonus.value),
        turnsSeconds: TURNS_TIMER_MINUTES * 60
      }
    }).catch(err => console.error('Publishing the round timer failed:', err))
  })

  /**
   * On mount, restores a persisted start time from a previous page load: computes the current
   * phase's elapsed time, then cascades through boundaries crossed while closed
   * (advancePastExpiry), so a long absence lands on the right phase with the right remaining time
   * instead of clamping to "expired". /
   */
  onMounted(() => {
    if (!startTime.value) return

    elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
    advancePastExpiry()

    if (phase.value !== 'ended') {
      isRunning.value = true
      resume()
    }
  })

  return {
    phase,
    isRunning,
    isExpired,
    isPaused,
    display,
    phaseLabel,
    phaseLabelColorClass,
    start,
    stop,
    reset,
    skipPreTimer,
    forceEndTurns,
    addMinutes,
    subtractMinutes,
    wouldExpireOnSubtract,
    stopLoop
  }
}
