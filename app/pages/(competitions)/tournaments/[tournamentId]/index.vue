<!-- app\pages\(competitions)\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/leagues/associates); these are
// still mock-data pages, expected to change dramatically once real functionality lands
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const tournamentUuid = computed(() => route.params.tournamentId as string)

const { data: tournamentsData } = useTournamentsQuery()
const tournament = computed(() =>
  tournamentsData.value?.find(item => item.uuid === tournamentUuid.value) ?? null)

useSeoMeta({
  title: () => tournament.value
    ? `${tournament.value.name}${tournamentStageText(tournament.value)}`
    : t('tournament.breadcrumb')
})

// Overrides the raw uuid path segment with the tournament's real name — same
// mechanism as leagues/[leagueId]/index.vue's own breadcrumb override. Stage
// number appended (tournamentStageText): a league's own same-named
// tournaments (e.g. "Premodern&Birrino" x8) would otherwise be
// indistinguishable in the breadcrumb/tab title.
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (tournament.value
    ? { [tournamentUuid.value]: `${tournament.value.name}${tournamentStageText(tournament.value)}` }
    : {}))
)

// "Back to league" link — see app/utils/tournaments/tournamentOrigin.ts for why this is
// a query param (?from=league:<uuid>) rather than a nested route.
const origin = computed(() => parseNavigationOrigin(route.query.from))
const { data: leaguesData } = useLeaguesQuery()
const originLeague = computed(() => origin.value
  ? leaguesData.value?.find(league => league.uuid === origin.value?.uuid) ?? null
  : null)

// Accepted ("Iscritti / Pagato") players from AcceptancePicker — the real
// player pool the Pods step and round-count logic both read from, not
// tournament.registeredPlayers (a separate, currently-unwired legacy
// snapshot column) — user request, 2026-08-24.
const acceptedPlayers = ref<AcceptancePickerItem[]>([])

const isDraft = computed(() => tournament.value?.format === 'Draft')

const { calculateRoundCount } = useSwissRoundCount()
const numberOfRounds = computed(() =>
  calculateRoundCount(acceptedPlayers.value.length, tournament.value?.roundCount))

const currentStep = ref(0)

// "Avvio evento" — flips the tournament out of registration and into play
// (user request, 2026-09-14). Only offered while registration is still open;
// once in_progress/completed/cancelled/external there's nothing left to start.
const { setStatus } = useTournamentsMutations()
const canStartTournament = computed(() => tournament.value?.status === 'registration_open')
const isStartConfirmOpen = ref(false)

async function confirmStartTournament() {
  if (!tournament.value) return
  try {
    await setStatus.mutateAsync({ id: tournament.value.id, status: 'in_progress' })
    isStartConfirmOpen.value = false
    // Moves off the acceptance step once the event actually starts — a no-op
    // if the organizer had already clicked ahead in the stepper themselves.
    if (currentStep.value === 0) currentStep.value = 1
  } catch (err) {
    toast.add({
      title: t('tournament.startTournamentErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

// Titles pair with a static description for now (e.g. "In attesa") — real
// per-round status (completed/in-progress/pending, based on actual
// tournament progress) needs round-tracking data that doesn't exist yet.
// See docs/TODO.md.
const items = computed(() => [
  {
    slot: 'acceptance',
    title: t('tournament.stepper.acceptance'),
    description: t('tournament.stepper.acceptanceDescription'),
    icon: ICONS.players
  },
  // Draft-only: pod formation happens once, before round 1 — Commander's
  // pod-every-round shape is a different flow entirely, deliberately not
  // modeled here (out of scope, see the plan for this change).
  ...(isDraft.value
    ? [{
      slot: 'pods',
      title: t('tournament.stepper.pods'),
      description: t('tournament.stepper.podsDescription'),
      icon: ICONS.layers
    }]
    : []),
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
    slot: 'leaderboard',
    title: t('tournament.stepper.leaderboard'),
    description: t('tournament.stepper.leaderboardDescription'),
    icon: ICONS.listOrdered
  }
])

// "Modifica torneo" — reuses the same edit modal/composable as the list
// page (user request, 2026-09-14: editing must stay possible from the
// detail page too, not just tournaments/index.vue's row actions).
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()

// Layout-debug switch (dev tool, user request 2026-09-14) — toggles
// .debug-spacing (main.css) on <html> to visualize every element's margin
// as a white gap against its own tinted border box. Removed on unmount so
// it can't leak into another page if the toggle is left on mid-navigation.
const debugSpacingEnabled = ref(false)
watch(debugSpacingEnabled, (enabled) => {
  document.documentElement.classList.toggle('debug-spacing', enabled)
})
onUnmounted(() => {
  document.documentElement.classList.remove('debug-spacing')
})
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <!-- Dev-only visibility into the real tournament.status while the
               acceptance -> in_progress flow is still being built out (user
               request, 2026-09-14) — reuses the same StatusChangeBadge
               dropdown Cover.vue/list rows already have, so it also doubles
               as a quick way to force a status during testing rather than
               going through the full "Avvia torneo" confirm flow every time. -->
          <TournamentsStatusBadge v-if="tournament" :tournament="tournament" />

          <USeparator orientation="vertical" class="h-4" />

          <USwitch
            v-model="debugSpacingEnabled"
            :label="$t('tournament.debugSpacingLabel')"
          />

          <USeparator orientation="vertical" class="h-4" />

          <EditIconButton
            v-if="tournament"
            :label="$t('tournament.rowActions.edit')"
            @click="openEditModal(tournament)"
          />

          <USeparator orientation="vertical" class="h-4" />

          <template v-if="canStartTournament">
            <UButton
              :icon="ICONS.battle"
              color="primary"
              variant="solid"
              size="md"
              @click="isStartConfirmOpen = true"
            >
              {{ $t('tournament.startTournament') }}
            </UButton>

            <USeparator orientation="vertical" class="h-4" />
          </template>

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>

        <template v-if="originLeague" #right>
          <UButton
            :to="`/leagues/${originLeague.uuid}`"
            :icon="ICONS.chevronLeft"
            color="neutral"
            variant="ghost"
            size="md"
          >
            {{ $t('tournament.backToLeague', { league: originLeague.name }) }}
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UStepper
        v-model="currentStep"
        :items="items"
      >
        <template #acceptance>
          <TournamentsSingleAcceptancePicker
            v-model:accepted="acceptedPlayers"
            :tournament-uuid="tournamentUuid"
            :is-draft="isDraft"
          />
        </template>

        <template v-if="isDraft" #pods>
          <TournamentsSinglePodsManager :players="acceptedPlayers" />
        </template>

        <template
          v-for="i in numberOfRounds"
          :key="`round-${i}`"
          #[`round-${i}`]
        >
          <TournamentsSingleRoundManager :round="i" />
        </template>

        <template #awards>
          <TournamentsSingleAwards />
        </template>

        <template #leaderboard>
          <TournamentsSingleLeaderboard />
        </template>
      </UStepper>
    </template>
  </UDashboardPanel>

  <ConfirmModal
    v-model:open="isStartConfirmOpen"
    :title="t('tournament.startTournamentConfirmTitle')"
    :description="t('tournament.startTournamentConfirmDescription')"
    :confirm-label="t('tournament.startTournament')"
    :confirm-icon="ICONS.battle"
    confirm-color="primary"
    :loading="setStatus.isLoading.value"
    @confirm="confirmStartTournament"
  />

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />
</template>
