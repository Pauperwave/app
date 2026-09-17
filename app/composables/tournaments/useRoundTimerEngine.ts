// app\composables\tournaments\useRoundTimerEngine.ts
// The actual countdown state machine behind RoundTimer.vue — phase state,
// persistence, interval ticking, and every action that changes the phase or
// its remaining time. Extracted 2026-09-18 (the component was ported 1:1
// from league at the time with an explicit "no changes" request; that
// constraint was for the porting step, not permanent — now that it's settled
// in, splitting the timer engine from the component's own fullscreen/
// confirm-dialog/template concerns is worth doing). No behavior change: same
// phase sequence, same localStorage keys, same sound cues.
export type RoundTimerPhase = 'pre' | 'round' | 'turns' | 'ended'

const PRE_TIMER_MINUTES = 3
const TURNS_TIMER_MINUTES = 15

export function useRoundTimerEngine(options: {
  round: number
  durationMinutes: MaybeRefOrGetter<number>
  /** Fired once when the "round" phase ends and "turni" begins. */
  onExpired: () => void
}) {
  const { t } = useI18n()
  const { play, playLoop, stopLoop } = useSoundEffects()

  // Once the final phase expires, keep the alarm repeating until any key is
  // pressed — a single "complete" chime is easy to miss when nobody's
  // looking at the screen at the exact moment the timer hits zero.
  useEventListener(window, 'keydown', stopLoop)
  // The loop lives in a module-scope singleton (see useSoundEffects.ts), so
  // it otherwise keeps blaring across a page navigation that unmounts this
  // component without anyone pressing a key first.
  onUnmounted(stopLoop)

  /** Which of the 3 phases (or the terminal "ended" state) is currently active. */
  const phase = useLocalStorage<RoundTimerPhase>(`round-timer-phase-${options.round}`, 'pre')

  /**
   * The Unix timestamp (ms) at which the *current phase* was last started or
   * resumed. Persisted to localStorage so a page refresh can restore the
   * running state. Null when nothing has been started yet, or the sequence
   * has reached "ended".
   */
  const startTime = useLocalStorage<number | null>(`round-timer-start-${options.round}`, null)

  /** Seconds elapsed in the current phase, accounting for pauses. */
  const elapsed = ref(0)

  /** Whether the interval is currently ticking. */
  const isRunning = ref(false)

  /** Extra minutes added to the "round" phase only (e.g. time extensions). */
  const timeBonus = useLocalStorage<number>(`round-timer-bonus-${options.round}`, 0)

  /** This phase's total duration in minutes (fixed for pre/turns, configurable + bonus for round). */
  const phaseDurationMinutes = computed(() => {
    if (phase.value === 'pre') return PRE_TIMER_MINUTES
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

  /** True once the timer has been started at least once and is currently
   * paused (not fresh, not expired, not ended). */
  const isPaused = computed(() => phase.value !== 'ended'
    && isTimerPaused(isRunning.value, startTime.value !== null, isExpired.value))

  /** Human-readable MM:SS string for the remaining time in the current phase. */
  const display = computed(() => formatDuration(remaining.value))

  /** Phase label shown to the right of the timer icon (one per phase,
   * including the terminal "ended" state). */
  const phaseLabel = computed(() => t(`tournament.single.roundTimer.phases.${phase.value}`))

  /** Phase label color — matches the phase's urgency (yellow for
   * get-ready/turns, green for active play, red for game over). */
  const phaseLabelColorClass = computed(() => {
    if (phase.value === 'round') return 'text-success'
    if (phase.value === 'ended') return 'text-error'
    return 'text-warning'
  })

  /**
   * Advances through phase boundaries as long as the current phase's elapsed
   * time has caught up to (or overtaken) its duration — a plain `if` would
   * only handle one boundary per tick, but a page that was closed through an
   * entire phase (or more) needs to cascade through all of them at once,
   * each carrying its overflow into the next phase's elapsed time so the
   * next phase's remaining time is still accurate. Called from both the
   * live tick and onMounted's catch-up, so a long absence behaves
   * identically to being watched live.
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
   * Lets the organizer skip straight from "pre" (SISTEMATEVI) to "round"
   * (GIOCO) once everyone's already seated, instead of waiting out the full
   * 3 minutes. Unlike advancePastExpiry's natural-expiry cascade, there's no
   * overflow to carry over — the phase just ends early, elapsed resets to 0.
   * Preserves whatever running/paused state "pre" was already in, rather
   * than forcing the round to auto-start.
   */
  function skipPreTimer() {
    if (phase.value !== 'pre') return
    play('notification')
    phase.value = 'round'
    elapsed.value = 0
    startTime.value = isRunning.value ? Date.now() : null
  }

  const { pause, resume } = useIntervalFn(() => {
    // startTime is set back to null when "ended" is reached (see
    // advancePastExpiry), so this alone also skips ticks after the sequence
    // is over — no separate `phase.value === 'ended'` check needed here.
    if (!startTime.value) return

    elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)

    if (elapsed.value >= totalSeconds.value) {
      advancePastExpiry()
      if (phase.value === 'ended') pause()
    }
  }, 1000, { immediate: false })

  /**
   * Start or resume the timer. Back-calculates the effective start time from
   * the current elapsed value so that paused time is correctly excluded.
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

  /** Stop the timer and reset the whole pre/round/turni sequence back to "pre". */
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
   * Lets the organizer force TURNI to end right now instead of waiting out
   * the remaining 15 minutes, going straight to the terminal FINE PARTITA
   * state — same end-of-sequence effect as TURNI expiring naturally
   * (advancePastExpiry's last branch), just triggered early and explicitly,
   * so the interval needs to be paused here instead of relying on the tick
   * handler's own post-advance pause.
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

  /** Add extra minutes to the "round" phase. If it had expired, restarts it
   * from the added time. */
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

  /** Remove minutes from the "round" phase, floored so its total duration
   * never goes below zero. */
  function subtractMinutes(minutes: number) {
    timeBonus.value = clampSubtractedBonus(
      timeBonus.value, minutes, toValue(options.durationMinutes)
    )
    play('deselect')
  }

  /** Whether subtracting this many minutes would immediately expire the
   * round — the caller (RoundTimer.vue) gates a confirm dialog on this. */
  function wouldExpireOnSubtract(minutes: number): boolean {
    return wouldSubtractExpireTimer(
      elapsed.value, timeBonus.value, minutes, toValue(options.durationMinutes)
    )
  }

  /**
   * On mount, check whether a persisted start time exists from a previous
   * page load. Computes raw elapsed time for the current phase, then
   * cascades through any phase boundaries that were crossed while the page
   * was closed (advancePastExpiry), so a long absence lands on the correct
   * phase with the correct remaining time instead of just clamping to
   * "expired".
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
