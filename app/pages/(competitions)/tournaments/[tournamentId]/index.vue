<!-- app\pages\(competitions)\tournaments\[tournamentId]\index.vue -->
<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const { t } = useI18n()

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
    icon: 'i-lucide-users'
  },
  ...Array.from({ length: numberOfRounds }, (_, i) => ({
    slot: `round-${i + 1}`,
    title: t('tournament.stepper.round', { n: i + 1 }),
    description: t('tournament.stepper.roundPending'),
    icon: 'i-lucide-swords'
  })),
  {
    slot: 'awards',
    title: t('tournament.stepper.awards'),
    description: t('tournament.stepper.awardsDescription'),
    icon: 'i-lucide-trophy'
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
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('tournament.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
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
