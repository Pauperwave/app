<!-- app\pages\(competitions)\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
// fallow-ignore-file code-duplication -- the UDashboardPanel navbar/toolbar/breadcrumb
// header skeleton mirrors other detail pages (events/leagues/associates); these are
// still mock-data pages, expected to change dramatically once real functionality lands
const { t } = useI18n()
const route = useRoute()
const tournamentUuid = computed(() => route.params.tournamentId as string)

const { data: tournamentsData } = useTournamentsQuery()
const tournament = computed(() =>
  tournamentsData.value?.find(item => item.uuid === tournamentUuid.value) ?? null)

useSeoMeta({ title: () => tournament.value?.name ?? t('tournament.breadcrumb') })

// Overrides the raw uuid path segment with the tournament's real name — same
// mechanism as leagues/[leagueId]/index.vue's own breadcrumb override.
const { breadcrumbItems } = useBreadcrumbs(
  computed(() => (tournament.value ? { [tournamentUuid.value]: tournament.value.name } : {}))
)

// "Back to league" link — see app/utils/tournamentOrigin.ts for why this is
// a query param (?from=league:<uuid>) rather than a nested route.
const origin = computed(() => parseNavigationOrigin(route.query.from))
const { data: leaguesData } = useLeaguesQuery()
const originLeague = computed(() => origin.value
  ? leaguesData.value?.find(league => league.uuid === origin.value?.uuid) ?? null
  : null)

// This could be dynamic based on tournament settings
const numberOfRounds = 2
const currentStep = ref(0)

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
  ...Array.from({ length: numberOfRounds }, (_, i) => ({
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
    icon: 'i-lucide-list-ordered'
  }
])
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
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>

        <template v-if="originLeague" #right>
          <!-- :ui leadingIcon override: UBreadcrumb's own separator chevron
               renders at size-5, but UButton's xs/sm sizes both default to
               size-4 — matched explicitly so the two chevrons in this same
               toolbar row read as the same size. -->
          <UButton
            :to="`/leagues/${originLeague.uuid}`"
            :icon="ICONS.chevronLeft"
            :ui="{ leadingIcon: 'size-5' }"
            color="neutral"
            variant="ghost"
            size="xs"
          >
            {{ $t('tournament.backToLeague', { league: originLeague.name }) }}
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UStepper v-model="currentStep" :items="items" class="space-y-6">
        <template #acceptance>
          <TournamentsSingleAcceptancePicker />
        </template>

        <template v-for="i in numberOfRounds" :key="`round-${i}`" #[`round-${i}`]>
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
</template>
