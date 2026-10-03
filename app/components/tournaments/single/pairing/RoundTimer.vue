<!-- app\components\tournaments\single\pairing\RoundTimer.vue -->
<!-- fallow-ignore-file code-duplication -- the TimerControlButton instances share a prop shape
     (icon/color/variant/:fullscreen/:tooltip/@click) but each is gated by a different phase
     condition and calls a different handler; fallow's line-scoped ignore doesn't work inside
     <template> (only // in <script>), so this is file-scoped -->
<!-- RoundTimer  Ported from league's RoundTimer.vue, then split: the countdown state machine lives
     in useRoundTimerEngine.ts, leaving this component with fullscreen mode, the 4 confirm dialogs
     and the template.  A 3-phase countdown sequence for one tournament round: 1. "pre": setup
     countdown, length set in /settings' Timer section (default 3 minutes, useRoundTimerEngine.ts).
     2. "round": the configured round duration (+ any added/removed bonus minutes). 3. "turns": a
     fixed 15-minute "TURNI" (extra turns) countdown. Once "turns" expires the display switches to a
     terminal "FINE PARTITA" state. Each phase auto-starts the next when it expires: a single Avvia
     click drives the whole sequence.  - Persists phase + start timestamp to localStorage keyed by
     round number, so a refresh resumes exactly where it left off, cascading through any phases that
     fully elapsed while the page was closed. - Supports pause/resume, reset and fullscreen mode. -
     Emits `expired` once, when the "round" phase ends (turns begins).  TODO: `durationMinutes` is a
     hardcoded default (75, league's fallback) as there is no per-tournament round-duration column.
     When this timer must sync with the Telegram app, design the real duration source and sync
     mechanism there, not just a DB column. -->
<script setup lang="ts">
const props = defineProps<{
  /** Total countdown duration in minutes for the "round" phase. */
  durationMinutes: number
  /** Round number — used to key the localStorage entry so each round has its own timer. */
  round: number
}>()

const emit = defineEmits<{
  /** Fired once when the "round" phase ends and "turni" begins. */
  expired: []
}>()

const { t } = useI18n()
const { play } = useSoundEffects()

const {
  phase, isRunning, isExpired, isPaused, display, phaseLabel, phaseLabelColorClass,
  start, stop, reset, skipPreTimer, forceEndTurns, addMinutes, subtractMinutes,
  wouldExpireOnSubtract
} = useRoundTimerEngine({
  round: props.round,
  durationMinutes: () => props.durationMinutes,
  onExpired: () => emit('expired')
})

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

const timerRef = useTemplateRef<HTMLDivElement>('timerRef')
const { isFullscreen, toggle } = useFullscreen(timerRef)

// Watched (not click-handler-wrapped) so Escape-key exits get the same
// "collapse" feedback as clicking the exit button.
watch(isFullscreen, (value) => {
  play(value ? 'expand' : 'collapse')
})

function handleToggleFullscreen() {
  toggle()
}

// "f-c" ("fullscreen countdown") — state lives here (isFullscreen/toggle from
// useFullscreen above), same "own the state, call defineShortcuts from that
// component" pattern as `b`/`h` in docs/architecture/shortcuts.md.
defineShortcuts({
  'f-c': handleToggleFullscreen
})

// "f c" hint next to the fullscreen button, shown from the moment "f" is
// pressed — same mechanism/UX as default.vue's own "g" nav hint.
const showFHint = useChordHintKey('f')

// --------------------------------------------------------------------------- Confirm dialogs
// --------------------------------------------------------------------------- Each gates a
// phase-transition/reset action from useRoundTimerEngine behind a confirm: ConfirmModal's @confirm
// doesn't close itself, so each wrapper both performs the action and closes its dialog

// Resetting wipes elapsed time AND added/removed minutes and restarts the whole pre/round/turni
// sequence from "pre": destructive and easy to fat-finger (especially on the oversized fullscreen
// buttons), so it is confirmed. One modal covers both the normal and fullscreen layouts, which
// render from the same template
const showResetConfirm = ref(false)
function confirmReset() {
  reset()
  showResetConfirm.value = false
}

// Subtracting minutes is otherwise unconfirmed (reversible via Add, unlike Reset), but one that
// would *immediately* expire the round is consequential, so it gets a lighter warning-colored
// confirm than Reset's error-colored one
const showSubtractExpireConfirm = ref(false)
const pendingSubtractMinutes = ref(0)
function onSubtractClick(minutes: number) {
  if (wouldExpireOnSubtract(minutes)) {
    pendingSubtractMinutes.value = minutes
    showSubtractExpireConfirm.value = true
    return
  }
  subtractMinutes(minutes)
}
function confirmSubtractExpire() {
  subtractMinutes(pendingSubtractMinutes.value)
  showSubtractExpireConfirm.value = false
}

// Both jump the sequence forward early (skipping SISTEMATEVI's or TURNI's remaining time): not
// destructive like Reset, but consequential enough (skips the round or ends the game) for a lighter
// confirmation
const showSkipPreConfirm = ref(false)
function confirmSkipPre() {
  skipPreTimer()
  showSkipPreConfirm.value = false
}

const showForceEndTurnsConfirm = ref(false)
function confirmForceEndTurns() {
  forceEndTurns()
  showForceEndTurnsConfirm.value = false
}
</script>

<template>
  <div
    ref="timerRef"
    class="flex items-center flex-wrap"
    :class="isFullscreen
      ? [
        'relative flex-col justify-center h-screen w-screen gap-12 @container-size',
        phase === 'ended' ? 'bg-error/10' : isPaused ? 'bg-warning/10' : 'bg-default'
      ]
      : phase === 'ended'
        ? 'gap-3 border border-error bg-error/10 rounded-lg px-4 py-2'
        : isPaused
          ? 'gap-3 border border-warning bg-warning/10 rounded-lg px-4 py-2'
          : 'gap-3 border border-default rounded-lg px-4 py-2'
    "
  >
    <TournamentsSinglePairingCurrentTime
      v-if="isFullscreen"
      class="absolute top-[4cqmin] left-[4cqmin] text-muted"
    />

    <UTooltip
      v-if="isFullscreen"
      :content="{ side: 'top' }"
      :text="t('tournament.single.roundTimer.exitFullscreenTooltip')"
    >
      <UButton
        :icon="ICONS.collapse"
        color="neutral"
        variant="ghost"
        size="xl"
        class="absolute top-[4cqmin] right-[4cqmin]"
        :aria-label="t('tournament.single.roundTimer.exitFullscreenTooltip')"
        @click="handleToggleFullscreen"
      />
    </UTooltip>

    <!-- Icon + phase label in their own row so the label stays right of the icon in fullscreen,
         where the outer container is flex-col (they would otherwise stack in DOM order) -->
    <div class="flex items-center gap-2">
      <UIcon
        :name="ICONS.timer"
        :class="[
          isExpired ? 'text-error' : isRunning ? 'text-primary' : 'text-muted',
          isFullscreen ? 'size-[20cqmin]' : 'size-5'
        ]"
      />

      <span
        class="font-bold uppercase tracking-wide"
        :class="[phaseLabelColorClass, isFullscreen ? 'text-[20cqmin]' : 'text-md']"
      >
        {{ phaseLabel }}
      </span>
    </div>

    <!-- Countdown display — nothing left to count once "ended". -->
    <span
      v-if="phase !== 'ended'"
      class="font-mono font-bold tabular-nums leading-none"
      :class="[
        isExpired ? 'text-error' : 'text-default',
        isFullscreen ? 'text-[32cqmin]' : 'text-2xl'
      ]"
    >
      {{ display }}
    </span>

    <!-- Controls: two groups that wrap onto their own line only when there isn't room for both,
         instead of always stacking or wrapping buttons raggedly -->
    <div
      class="flex"
      :class="isFullscreen ? 'flex-row gap-8' : 'flex-wrap gap-2'"
    >
      <div class="flex items-center" :class="isFullscreen ? 'flex-row gap-8' : 'gap-1'">
        <template v-if="phase !== 'ended'">
          <TournamentsSinglePairingTimerControlButton
            v-if="!isRunning"
            :icon="ICONS.play"
            color="primary"
            variant="soft"
            :disabled="isExpired"
            :fullscreen="isFullscreen"
            :tooltip="isExpired
              ? t('tournament.single.roundTimer.expiredTooltip')
              : t('tournament.single.roundTimer.startTooltip')"
            @click="start"
          />
          <TournamentsSinglePairingTimerControlButton
            v-else
            :icon="ICONS.pause"
            color="neutral"
            variant="soft"
            :fullscreen="isFullscreen"
            :tooltip="t('tournament.single.roundTimer.pauseTooltip')"
            @click="stop"
          />
        </template>

        <TournamentsSinglePairingTimerControlButton
          v-if="phase === 'pre'"
          :icon="ICONS.forward"
          color="success"
          variant="subtle"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.skipPreTooltip')"
          @click="showSkipPreConfirm = true"
        />

        <TournamentsSinglePairingTimerControlButton
          v-if="phase === 'turns'"
          :icon="ICONS.flag"
          color="error"
          variant="subtle"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.forceEndTooltip')"
          @click="showForceEndTurnsConfirm = true"
        />

        <TournamentsSinglePairingTimerControlButton
          :icon="ICONS.rotateBack"
          color="error"
          variant="subtle"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.resetTooltip')"
          @click="showResetConfirm = true"
        />

        <TournamentsSinglePairingTimerControlButton
          v-if="!isFullscreen"
          :icon="ICONS.expand"
          color="neutral"
          variant="ghost"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.fullscreenTooltip')"
          @click="handleToggleFullscreen"
        />

        <ChordHint :keys="['f', 'c']" :show="!isFullscreen && showFHint" />
      </div>

      <div
        v-if="phase === 'round'"
        class="flex items-center"
        :class="isFullscreen ? 'flex-row gap-8' : 'gap-1'"
      >
        <TournamentsSinglePairingTimerControlButton
          :icon="ICONS.subtract"
          color="error"
          variant="outline"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.subtract10Tooltip')"
          label="10:00"
          @click="onSubtractClick(10)"
        />

        <TournamentsSinglePairingTimerControlButton
          :icon="ICONS.subtract"
          color="error"
          variant="outline"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.subtract5Tooltip')"
          label="5:00"
          @click="onSubtractClick(5)"
        />

        <TournamentsSinglePairingTimerControlButton
          :icon="ICONS.add"
          color="success"
          variant="outline"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.add5Tooltip')"
          label="5:00"
          @click="addMinutes(5)"
        />

        <TournamentsSinglePairingTimerControlButton
          :icon="ICONS.add"
          color="success"
          variant="outline"
          :fullscreen="isFullscreen"
          :tooltip="t('tournament.single.roundTimer.add10Tooltip')"
          label="10:00"
          @click="addMinutes(10)"
        />
      </div>
    </div>

    <ConfirmModal
      v-model:open="showResetConfirm"
      :title="t('tournament.single.roundTimer.resetConfirm.title')"
      :description="t('tournament.single.roundTimer.resetConfirm.description')"
      :warning="t('tournament.single.roundTimer.resetConfirm.question')"
      :confirm-label="t('tournament.single.roundTimer.resetConfirm.confirmLabel')"
      :confirm-icon="ICONS.rotateBack"
      :portal="!isFullscreen"
      @confirm="confirmReset"
    />

    <ConfirmModal
      v-model:open="showSubtractExpireConfirm"
      :title="t('tournament.single.roundTimer.subtractExpireConfirm.title')"
      :description="t('tournament.single.roundTimer.subtractExpireConfirm.description')"
      :warning="t('tournament.single.roundTimer.subtractExpireConfirm.question')"
      :confirm-label="t('tournament.single.roundTimer.subtractExpireConfirm.confirmLabel')"
      :confirm-icon="ICONS.subtract"
      confirm-color="warning"
      :portal="!isFullscreen"
      @confirm="confirmSubtractExpire"
    />

    <ConfirmModal
      v-model:open="showSkipPreConfirm"
      :title="t('tournament.single.roundTimer.skipPreConfirm.title')"
      :description="t('tournament.single.roundTimer.skipPreConfirm.description')"
      :warning="t('tournament.single.roundTimer.skipPreConfirm.question')"
      :confirm-label="t('tournament.single.roundTimer.skipPreConfirm.confirmLabel')"
      :confirm-icon="ICONS.forward"
      confirm-color="warning"
      :portal="!isFullscreen"
      @confirm="confirmSkipPre"
    />

    <ConfirmModal
      v-model:open="showForceEndTurnsConfirm"
      :title="t('tournament.single.roundTimer.forceEndConfirm.title')"
      :description="t('tournament.single.roundTimer.forceEndConfirm.description')"
      :warning="t('tournament.single.roundTimer.forceEndConfirm.question')"
      :confirm-label="t('tournament.single.roundTimer.forceEndConfirm.confirmLabel')"
      :confirm-icon="ICONS.flag"
      :portal="!isFullscreen"
      @confirm="confirmForceEndTurns"
    />
  </div>
</template>
