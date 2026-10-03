<!-- app\pages\(competitions)\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- header skeleton mirrors other detail pages
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

const { t } = useI18n()
const route = useRoute()
const tournamentUuid = computed(() => route.params.tournamentId as string)

const { data: tournamentsData } = useTournamentsQuery({ includeTest: true })
const tournament = computed(() =>
  tournamentsData.value?.find(item => item.uuid === tournamentUuid.value) ?? null)

useSeoMeta({
  title: () => tournament.value
    ? `${tournament.value.name}${tournamentStageText(tournament.value)}`
    : t('tournament.breadcrumb')
})

// Overrides the raw uuid path segment with the tournament's real name (like
// leagues/[leagueId]/index.vue's breadcrumb override). The stage number is appended
// (tournamentStageText): a league's same-named tournaments (e.g. "Premodern&Birrino" x8) would
// otherwise be indistinguishable in the breadcrumb/tab title
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (tournament.value
    ? { [tournamentUuid.value]: `${tournament.value.name}${tournamentStageText(tournament.value)}` }
    : {}))
)

// "Back to league" link: see app/utils/tournaments/tournamentOrigin.ts for why it is a query param
// (?league=<uuid>) rather than a nested route
const origin = computed(() => parseNavigationOrigin(route.query.league))
const { data: leaguesData } = useLeaguesQuery()
const originLeague = computed(() => origin.value
  ? leaguesData.value?.find(league => league.uuid === origin.value?.uuid) ?? null
  : null)

// Accepted ("Iscritti / Pagato") players from AcceptancePicker: the real player pool the Pods step
// reads from, not tournament.registeredPlayers (a separate, unwired legacy snapshot column). Only
// populated once AcceptancePicker is mounted (its v-model:accepted), so the round-count logic below
// deliberately doesn't depend on it (see acceptedCount's comment)
const acceptedPlayers = ref<AcceptancePickerItem[]>([])

// Registrations are frozen from round 1 until a turn-back reopens them (server-enforced too).
const registrationsLocked = computed(() =>
  !!tournament.value && !['draft', 'registration_open'].includes(tournament.value.status))

const isDraft = computed(() => tournament.value?.format === 'Draft')
const isCommander = computed(() => tournament.value?.format === 'Commander')
const { liveStandings } = useLiveCommanderStandings(tournamentUuid)
const { liveStandings: liveSwissStandings } = useLiveSwissStandings(tournamentUuid)
// Everything else pairs 1v1 in Swiss rounds (Pauper/Premodern/Oldschool/Sealed/Cubo Vintage),
// except "Cubo Commander", which is still a multiplayer pod format despite the name and stays on
// the RoundManager.vue stub until it is wired into Commander's flow (a decision not made yet)
const isCubeCommander = computed(() => tournament.value?.format === 'Cubo Commander')
const is1v1Format = computed(() =>
  !!tournament.value && !isDraft.value && !isCommander.value && !isCubeCommander.value)

// tournament_registrations, read independently of AcceptancePicker (same query key, ADR-007 shared
// cache, no extra fetch) so the round count below is available even when the organizer opens the
// tournament on a later step and AcceptancePicker never mounts (UStepper only renders the active
// step's content, via @nuxt/ui's Stepper.vue `v-if` on `currentStep`). Matches
// AcceptancePicker.vue's sourceRowStatus() mapping of `status === 'checked_in'` to "accepted"
const {
  data: registrationsData,
  isLoading: isRegistrationsLoading
} = useTournamentRegistrationsQuery(tournamentUuid)
// Registrations made through the Telegram bot appear without a refresh.
useTournamentRegistrationsRealtime(tournamentUuid)
const acceptedCount = computed(() =>
  (registrationsData.value ?? []).filter(r => r.status === 'checked_in').length)

// Same two queries AcceptancePicker builds the accepted players from (shared cache, no extra
// fetch): "Avvia torneo" shows loading until they land, instead of looking clickable while still
// disabled.
const { isLoading: isAssociatesLoading } = useAssociatesQuery()
const isAcceptedPlayersLoading = computed(() =>
  isRegistrationsLoading.value || isAssociatesLoading.value)

const { calculateRoundCount } = useSwissRoundCount()
const { data: settings } = useSettingsQuery()
const numberOfRounds = computed(() => calculateRoundCount(
  acceptedCount.value,
  tournament.value?.roundCount,
  settings.value
    ? { tiers: settings.value.swissRoundCountTiers, beyond: settings.value.swissRoundCountBeyond }
    : undefined
))

// URL sync (ported from league's useTournamentUrl.ts): reflects the current stepper slot and the
// pods-preview modal into ?step=/&preview=1, so a refresh or shared link lands on the same step
// instead of resetting to "acceptance". Called once here and threaded into both composables below:
// useTournamentUrl.ts's same-tick update coalescing only works with a single shared instance (see
// its file comment)
const {
  stepFromQuery, syncStep, previewFromQuery, syncPreview
} = useTournamentUrl()

const { items, currentStep } = useTournamentStepper({
  tournamentUuid, tournament, isCommander, is1v1Format, numberOfRounds, stepFromQuery, syncStep
})

const {
  canStartTournament, isStartConfirmOpen, confirmStartTournament, setStatus,
  canResetTournament, isResetConfirmOpen, confirmResetTournament, resetTournament,
  podsModalOpen, tablePreviewPlayers, seatingFor, canOpenTablePreview,
  onStartTournamentClick,
  pendingAdvancePreviewRound, onRoundTurnedBack, onAdvancePreviewAutoOpened,
  onPodsConfirm, onSwissPodsConfirm, onDraftPodsConfirm, startRoundOne, startRoundOneSwiss
} = useTournamentLifecycleFlow({
  tournamentUuid,
  tournament,
  isDraft,
  isCommander,
  is1v1Format,
  acceptedPlayers,
  previewFromQuery,
  syncPreview
})

// "Modifica torneo" reuses the edit modal/composable of the list page: editing must stay possible
// from the detail page too, not just tournaments/index.vue's row actions
const { editingTournament, editModalOpen, openEditModal } = useTournamentsRowActions()
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
          <!-- Dev-only visibility into the real tournament.status while the acceptance ->
               in_progress flow is built out: it reuses the StatusChangeBadge dropdown
               Cover.vue/list rows have, so it doubles as a quick way to force a status in
               testing instead of the full "Avvia torneo" confirm flow -->
          <TournamentsStatusBadge v-if="tournament" :tournament="tournament" />

          <USeparator orientation="vertical" class="h-4" />

          <TournamentsSingleTelegramNotificationsSwitch
            v-if="tournament"
            :tournament="tournament"
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
              :loading="isAcceptedPlayersLoading"
              :disabled="!canOpenTablePreview"
              @click="onStartTournamentClick"
            >
              {{ $t('tournament.startTournament') }}
            </UButton>

            <USeparator orientation="vertical" class="h-4" />
          </template>

          <template v-if="canResetTournament">
            <UButton
              :icon="ICONS.rotateBack"
              color="error"
              variant="outline"
              size="md"
              @click="isResetConfirmOpen = true"
            >
              {{ $t('tournament.single.resetButton') }}
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
            :readonly="registrationsLocked"
            :is-draft="isDraft"
            :is1v1="is1v1Format"
          />
        </template>

        <template
          v-for="i in numberOfRounds"
          :key="`round-${i}`"
          #[`round-${i}`]
        >
          <TournamentsSingleCommanderRoundManager
            v-if="isCommander"
            :tournament-uuid="tournamentUuid"
            :round-number="i"
            :round-count="numberOfRounds"
            :round-duration-minutes="tournament?.roundDurationMinutes"
            :auto-open-advance-preview="pendingAdvancePreviewRound === i"
            :next-round-seating="seatingFor(i + 1)"
            @turned-back="onRoundTurnedBack(i)"
            @advance-preview-auto-opened="onAdvancePreviewAutoOpened"
          />
          <TournamentsSingleSwissRoundManager
            v-else-if="is1v1Format"
            :tournament-uuid="tournamentUuid"
            :round-number="i"
            :round-count="numberOfRounds"
            :round-duration-minutes="tournament?.roundDurationMinutes"
            :auto-open-advance-preview="pendingAdvancePreviewRound === i"
            :next-round-seating="seatingFor(i + 1)"
            @turned-back="onRoundTurnedBack(i)"
            @advance-preview-auto-opened="onAdvancePreviewAutoOpened"
          />
          <TournamentsSingleRoundManager v-else :round="i" />
        </template>

        <template #awards>
          <TournamentsSingleAwards
            v-if="isCommander"
            :tournament-uuid="tournamentUuid"
            :standings="liveStandings"
          />
        </template>

        <template #prizes>
          <TournamentsSinglePrizes v-if="isCommander" :standings="liveStandings" />
          <TournamentsSinglePrizes v-else-if="is1v1Format" :standings="liveSwissStandings" />
        </template>

        <template #leaderboard>
          <TournamentsSingleLeaderboard
            :tournament-uuid="tournamentUuid"
            :commander-standings="isCommander ? liveStandings : undefined"
            :swiss-standings="is1v1Format ? liveSwissStandings : undefined"
          />
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

  <ConfirmModal
    v-model:open="isResetConfirmOpen"
    :title="t('tournament.single.resetConfirmTitle')"
    :description="t('tournament.single.resetConfirmDescription')"
    :warning="t('tournament.single.resetConfirmWarning')"
    :confirm-label="t('tournament.single.resetButton')"
    :confirm-icon="ICONS.rotateBack"
    confirm-color="error"
    :loading="resetTournament.isLoading.value"
    @confirm="confirmResetTournament"
  />

  <TournamentsListEditModal v-model="editModalOpen" :tournament="editingTournament" />

  <!-- Table formation has no dedicated stepper step (see items' comment): these are transient
       modals opened by "Avvia torneo" (round 1) or a round manager's "Prossimo
       round"/turn-back, over whichever step is active -->
  <TournamentsSinglePodsManager
    v-if="isDraft"
    v-model:open="podsModalOpen"
    :players="acceptedPlayers"
    @confirm="onDraftPodsConfirm"
  />

  <TournamentsSinglePairingTablePreviewModal
    v-else-if="isCommander"
    v-model:open="podsModalOpen"
    :players="tablePreviewPlayers"
    :tournament-uuid="tournamentUuid"
    :current-round="1"
    :confirmed-seating="seatingFor(1)"
    :loading="startRoundOne.isLoading.value"
    @confirm="onPodsConfirm"
  />

  <TournamentsSinglePairingSwissTablePreviewModal
    v-else-if="is1v1Format"
    v-model:open="podsModalOpen"
    :players="tablePreviewPlayers"
    :confirmed-seating="seatingFor(1)"
    :loading="startRoundOneSwiss.isLoading.value"
    @confirm="onSwissPodsConfirm"
  />
</template>
