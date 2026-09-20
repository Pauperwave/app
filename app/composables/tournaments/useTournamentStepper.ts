// app\composables\tournaments\useTournamentStepper.ts
// Fully-derived stepper position (2026-09-18 refactor, matching league's own
// always-reactive TournamentStepper.vue currentStep/displayStep computeds) —
// extracted out of [tournamentId]/index.vue alongside
// useTournamentLifecycleFlow.ts, once both had grown into the largest, least
// readable parts of that page. Replaces an earlier one-shot restore + a
// scattered set of per-action `currentStep.value = ...` calls (start/reset/
// advance/turn-back round), which was missing the "advance round" case
// entirely (bug: clicking "Conferma" in the table preview created the next
// round in the DB but never moved the stepper there).
import type { ComputedRef } from 'vue'
import type { Tournament } from '~/types'
import { reachedStepSlots, resolveActiveStepSlot } from '~/utils/tournaments/tournamentSteps'

export function useTournamentStepper(options: {
  tournamentUuid: MaybeRefOrGetter<string>
  tournament: ComputedRef<Tournament | null>
  isCommander: ComputedRef<boolean>
  is1v1Format: ComputedRef<boolean>
  numberOfRounds: ComputedRef<number>
  stepFromQuery: ComputedRef<string | undefined>
  syncStep: (slot: string) => void
}) {
  const {
    tournamentUuid, tournament, isCommander, is1v1Format, numberOfRounds,
    stepFromQuery, syncStep
  } = options
  const { t } = useI18n()

  // Titles pair with a static description for now (e.g. "In attesa") — real
  // per-round status (completed/in-progress/pending, based on actual
  // tournament progress) needs round-tracking data that doesn't exist yet.
  // See docs/TODO.md.
  // Every step the tournament can go through, whether it has reached it or not
  // (see `items` below for what is actually clickable).
  const allItems = computed(() => [
    {
      slot: 'acceptance',
      title: t('tournament.stepper.acceptance'),
      description: t('tournament.stepper.acceptanceDescription'),
      icon: ICONS.players
    },
    // Table formation deliberately has NO dedicated stepper step (it isn't a
    // "stage" the organizer sits on, just a transient modal on top of
    // whichever step is already active) — "Avvia torneo" opens it straight
    // from "acceptance", and each round's own "Prossimo round"/turn-back
    // reopens the equivalent modal on top of that round's own step (see
    // useTournamentLifecycleFlow.ts's own podsModalOpen).
    ...Array.from({ length: numberOfRounds.value }, (_, i) => ({
      slot: `round-${i + 1}`,
      title: t('tournament.stepper.round', { n: i + 1 }),
      description: t('tournament.stepper.roundPending'),
      icon: ICONS.battle
    })),
    {
      slot: 'awards',
      title: t('tournament.stepper.awards'),
      description: t('tournament.stepper.awardsDescription'),
      icon: ICONS.standings
    },
    {
      slot: 'prizes',
      title: t('tournament.stepper.prizes'),
      description: t('tournament.stepper.prizesDescription'),
      icon: ICONS.booster
    },
    {
      slot: 'leaderboard',
      title: t('tournament.stepper.leaderboard'),
      description: t('tournament.stepper.leaderboardDescription'),
      icon: ICONS.listOrdered
    }
  ])

  // Which step the tournament is actually "at" right now — opening a
  // tournament should land the organizer on its real current step, not
  // always back at "Accettazione". Only Commander/1v1 Swiss persist real
  // per-round progress (tournament_rounds) — Draft/Cubo Commander have no
  // round tracking yet, so an in-progress one there just falls back to round 1.
  const { data: rounds } = useTournamentRoundsQuery(tournamentUuid)
  const tracksRounds = computed(() => isCommander.value || is1v1Format.value)
  const currentRoundNumber = computed(() => {
    const roundNumbers = (rounds.value ?? []).map(r => r.roundNumber)
    return roundNumbers.length ? Math.max(...roundNumbers) : 0
  })
  const defaultStepSlot = computed(() => {
    if (!tournament.value) return null
    if (tournament.value.status === 'completed') return 'leaderboard'
    if (currentRoundNumber.value > 0) return `round-${currentRoundNumber.value}`
    if (tournament.value.status === 'in_progress') return 'round-1'
    return 'acceptance'
  })

  // The steps up to the tournament's real current one (all of them once it is
  // completed). Every step stays visible, but the ones ahead can't be opened —
  // not with a click, not with a `?step=` link: the tournament only gets there
  // through its own buttons ("Avvia torneo", "Prossimo round", ...). See
  // tournamentSteps.ts. Free navigation between steps is a testing aid: allowed
  // in development (import.meta.dev) and, in production, while the developer
  // view is on (a password-gated speed bump like the toggle itself, not a
  // security boundary — the actions keep their own permissions).
  const { isDeveloperView } = useDeveloperView()

  const reachedSlots = computed(() => reachedStepSlots(
    allItems.value.map(item => item.slot),
    defaultStepSlot.value,
    tournament.value?.status === 'completed',
    import.meta.dev || isDeveloperView.value
  ))

  const items = computed(() => allItems.value.map(item => ({
    ...item,
    disabled: !reachedSlots.value.includes(item.slot)
  })))

  // `manualStepSlot` is the organizer's own explicit navigation (clicking a
  // step, or a bookmarked `?step=` link); it's cleared the moment the
  // tournament's real step changes, so any actual progress (round advance/
  // turn-back/start/reset/end) always wins over a stale manual view, without
  // every mutation site needing its own bespoke stepper update.
  const manualStepSlot = ref<string | null>(null)

  let hasInitializedStep = false
  function tryInitializeStep() {
    if (hasInitializedStep || !tournament.value) return
    // Wait for tournament_rounds to load on formats that track it, so an
    // in-progress tournament doesn't lock onto "acceptance" just because the
    // rounds query hasn't resolved yet.
    if (tracksRounds.value && rounds.value === undefined) return
    manualStepSlot.value = stepFromQuery.value ?? null
    hasInitializedStep = true

    // A `?step=` link to a step not reached yet was ignored above: correct the
    // URL to the step actually shown instead of leaving the stale one in it
    const shownSlot = activeStepSlot.value
    if (shownSlot && stepFromQuery.value !== shownSlot) syncStep(shownSlot)
  }
  // Deferred to onMounted (client-only) — rounds/tournament aren't
  // SSR-prefetched, so applying this correction eagerly during setup would
  // render a different step server- vs. client-side and crash UStepper's
  // single-active-step content (Stepper.vue's own v-if) with "Cannot read
  // properties of null (reading 'insertBefore')" instead of just a hydration
  // warning. Real changes to `defaultStepSlot` after this point are normal
  // post-hydration reactive updates, not part of the initial render.
  watch([allItems, rounds, tournament], () => tryInitializeStep())
  onMounted(() => tryInitializeStep())

  // Only after the initial restore above — otherwise defaultStepSlot's own
  // first resolution (from `null` to a real value while data loads) would
  // itself count as "real progress" and immediately wipe out a `?step=`
  // bookmark before it had a chance to apply.
  watch(defaultStepSlot, () => {
    if (hasInitializedStep) manualStepSlot.value = null
  })

  // A manual pick (or `?step=` link) to a step not reached yet is ignored
  const activeStepSlot = computed(() => resolveActiveStepSlot(
    manualStepSlot.value,
    reachedSlots.value,
    defaultStepSlot.value
  ))

  const currentStep = computed({
    get: () => {
      const slot = activeStepSlot.value
      if (!slot) return 0
      const index = items.value.findIndex(item => item.slot === slot)
      return index === -1 ? 0 : index
    },
    // UStepper's v-model — clicking a step (or anything else assigning an
    // index) is the organizer's own explicit navigation, recorded as a manual
    // override until the next real change to defaultStepSlot clears it again.
    set: (index: number) => {
      const slot = items.value[index]?.slot ?? null
      // A step ahead of the tournament's progress is not reachable
      if (slot && !reachedSlots.value.includes(slot)) return
      manualStepSlot.value = slot
    }
  })

  watch(() => items.value[currentStep.value]?.slot, (slot) => {
    if (slot) syncStep(slot)
  })

  return { items, currentStep }
}
