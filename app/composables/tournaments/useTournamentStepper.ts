// app\composables\tournaments\useTournamentStepper.ts
// Fully-derived stepper position (like league's always-reactive TournamentStepper.vue
// currentStep/displayStep computeds), split from [tournamentId]/index.vue alongside
// useTournamentLifecycleFlow.ts. Replaces a one-shot restore plus scattered per-action
// `currentStep.value = ...` calls, which missed the "advance round" case.
import type { ComputedRef } from 'vue'
import type { Tournament } from '~/types'
import {
  reachedStepSlots, resolveActiveStepSlot, stepProgress
} from '~/utils/tournaments/tournamentSteps'

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

  // Every step the tournament can go through, reached or not (see `items` for what is clickable)
  const allItems = computed(() => [
    {
      slot: 'acceptance',
      title: t('tournament.stepper.acceptance'),
      icon: ICONS.players
    },
    // Table formation has NO dedicated stepper step: it is a transient modal over the active step.
    // "Avvia torneo" opens it from "acceptance", and each round's "Prossimo round"/turn-back
    // reopens it over that round's step (see useTournamentLifecycleFlow.ts's podsModalOpen)
    ...Array.from({ length: numberOfRounds.value }, (_, i) => ({
      slot: `round-${i + 1}`,
      title: t('tournament.stepper.round', { n: i + 1 }),
      icon: ICONS.battle
    })),
    // The awards (Vittima, Carnefice, Master Brewer, Il Player) come from kills and votes, so this
    // step only exists for Commander
    ...(isCommander.value
      ? [{
        slot: 'awards',
        title: t('tournament.stepper.awards'),
        icon: ICONS.standings
      }]
      : []),
    {
      slot: 'prizes',
      title: t('tournament.stepper.prizes'),
      icon: ICONS.booster
    },
    {
      slot: 'leaderboard',
      title: t('tournament.stepper.leaderboard'),
      icon: ICONS.listOrdered
    }
  ])

  // Which step the tournament is actually "at": opening it lands the organizer on its real current
  // step, not "Accettazione". Only Commander/1v1 Swiss persist per-round progress
  // (tournament_rounds); Draft/Cubo Commander in progress fall back to round 1
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

  // The steps up to the tournament's real current one (all once completed). Every step stays
  // visible but the ones ahead can't be opened (click or `?step=` link): the tournament gets there
  // through its own buttons (see tournamentSteps.ts). Free navigation is a testing aid, allowed in
  // development and, in production, while the developer view is on (a password-gated speed bump,
  // not a security boundary: actions keep their own permissions)
  const { isDeveloperView } = useDeveloperView()

  const reachedSlots = computed(() => reachedStepSlots(
    allItems.value.map(item => item.slot),
    defaultStepSlot.value,
    tournament.value?.status === 'completed',
    import.meta.dev || isDeveloperView.value
  ))

  // The line under each title follows what the tournament has actually done (stepProgress).
  const roundStatusByNumber = computed(() =>
    new Map((rounds.value ?? []).map(round => [round.roundNumber, round.status])))

  const items = computed(() => allItems.value.map(item => ({
    ...item,
    description: t(`tournament.stepper.progress.${stepProgress(item.slot, {
      tournamentStatus: tournament.value?.status ?? null,
      roundStatusByNumber: roundStatusByNumber.value
    })}`),
    disabled: !reachedSlots.value.includes(item.slot)
  })))

  // `manualStepSlot` is the organizer's explicit navigation (a click or a bookmarked `?step=`
  // link), cleared when the tournament's real step changes, so real progress
  // (advance/turn-back/start/reset/end) beats a stale view without per-mutation updates
  const manualStepSlot = ref<string | null>(null)

  let hasInitializedStep = false
  function tryInitializeStep() {
    if (hasInitializedStep || !tournament.value) return
    // Wait for tournament_rounds on formats that track it, so an in-progress tournament doesn't
    // lock onto "acceptance"
    if (tracksRounds.value && rounds.value === undefined) return
    manualStepSlot.value = stepFromQuery.value ?? null
    hasInitializedStep = true

    // A `?step=` link to a step not reached yet was ignored above: correct the URL to the step
    // actually shown
    const shownSlot = activeStepSlot.value
    if (shownSlot && stepFromQuery.value !== shownSlot) syncStep(shownSlot)
  }
  // Deferred to onMounted (client-only): rounds/tournament aren't SSR-prefetched, so correcting
  // eagerly in setup would render a different step server- vs client-side and crash UStepper's
  // single-active-step content ("Cannot read properties of null (reading 'insertBefore')"). Later
  // changes to `defaultStepSlot` are normal post-hydration updates
  watch([allItems, rounds, tournament], () => tryInitializeStep())
  onMounted(() => tryInitializeStep())

  // Only after the initial restore: defaultStepSlot's first resolution (null -> real value) would
  // otherwise count as "real progress" and wipe a `?step=` bookmark before it applied
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
    // UStepper's v-model: a click (or anything assigning an index) is explicit navigation, a manual
    // override until the next real change to defaultStepSlot
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
