<!-- app\components\tournaments\single\pairing\RoundTimer.vue -->
<!-- fallow-ignore-file code-duplication -- the TimerControlButton instances in
     the template share a prop shape (icon/color/variant/:fullscreen/:tooltip/
     @click) but each is gated by a different phase condition and calls a
     different handler; fallow's line-scoped ignore comment doesn't work inside
     <template> (only // comments in <script>, tested 2026-08-03), so this is
     file-scoped instead. -->
<!--
  RoundTimer

  Ported 1:1 from MagicTheGathering/league's RoundTimer.vue (user request
  2026-09-16: "bisogna copiare il timer così com'è senza modifiche"), then
  split once porting was done (user follow-up 2026-09-17: that constraint
  was for the porting phase only, not permanent — the countdown state
  machine now lives in useRoundTimerEngine.ts, leaving this component with
  just fullscreen mode, the 4 confirm dialogs, and the template). No
  behavior change from the original.

  A 3-phase countdown sequence for a single tournament round:
  1. "pre" — fixed 3-minute setup countdown.
  2. "round" — the configured round duration (+ any added/removed bonus minutes).
  3. "turns" — a fixed 15-minute "TURNI" (extra turns) countdown.
  Once "turns" expires, the display switches to a terminal "FINE PARTITA" state.
  Each phase auto-starts the next when it expires — a single Avvia click
  drives the whole sequence.

  - Persists phase + start timestamp to localStorage keyed by round number,
    so a page refresh resumes exactly where it left off — including
    cascading through any phases that fully elapsed while the page was
    closed (e.g. laptop asleep through the whole round + turns).
  - Supports pause/resume, reset, and fullscreen mode.
  - Emits `expired` once, when the "round" phase ends (turns begins).

  TODO (2026-09-16): `durationMinutes` is a hardcoded default (75, same
  fallback league itself uses) — this app has no per-tournament round-
  duration column yet. Once this timer needs to sync with the Telegram app
  (user request), that's also where a real duration source/sync mechanism
  should be designed, not just a DB column.
-->
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

// ---------------------------------------------------------------------------
// Confirm dialogs
// ---------------------------------------------------------------------------
// Each of these gates a phase-transition/reset action from useRoundTimerEngine
// behind a confirm — ConfirmModal's own @confirm doesn't close itself, so
// each wrapper below both performs the action and closes its own dialog.

// Resetting wipes elapsed time AND any added/removed minutes, and restarts
// the whole pre/round/turni sequence from "pre" — destructive enough (and
// easy to fat-finger, especially on the oversized fullscreen buttons) to
// gate behind a confirmation. One modal instance covers both the normal and
// fullscreen layouts, since this component renders both from the same template.
const showResetConfirm = ref(false)
function confirmReset() {
  reset()
  showResetConfirm.value = false
}

// Subtracting minutes is otherwise unconfirmed (reversible via Add, unlike
// Reset) — but a subtraction that would *immediately* expire the round is
// the one consequential case, so it gets a lighter, warning-colored confirm
// rather than Reset's heavier error-colored one.
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

// Both jump the sequence forward early (skipping SISTEMATEVI's remaining
// time, or TURNI's) — not destructive in the "lose data" sense Reset is,
// but consequential enough (skips the whole round or ends the game outright)
// to gate behind a lighter confirmation too.
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

    <!-- Icon + phase label paired in their own row so the label stays to
         the icon's right even in fullscreen mode, where the outer
         container is flex-col (icon/label/digits/controls would otherwise
         stack vertically in DOM order instead). -->
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

    <!-- Controls — two groups that wrap independently onto their own line
         only when there isn't enough horizontal room for both, instead of
         always stacking or letting individual buttons wrap raggedly. -->
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
