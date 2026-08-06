<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const { t } = useI18n()

// This could be dynamic based on tournament settings
const numberOfRounds = 5
const currentStep = ref(0)

const items = computed(() => [
  {
    slot: 'acceptance',
    title: t('tournaments.detail.acceptance'),
    icon: 'i-lucide-users'
  },
  ...Array.from({ length: numberOfRounds }, (_, i) => ({
    slot: `round-${i + 1}`,
    title: t('tournaments.detail.round', { n: i + 1 }),
    icon: 'i-lucide-swords'
  })),
  {
    slot: 'awards',
    title: t('tournaments.detail.awards'),
    icon: 'i-lucide-trophy'
  }
])
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar :title="$t('nav.tournaments')">
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
      </UStepper>
    </template>
  </UDashboardPanel>
</template>
