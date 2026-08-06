<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
const { t } = useI18n()

// This could be dynamic based on tournament settings
const numberOfRounds = 5
const currentStep = ref(0)

const items = computed(() => [
  {
    slot: 'acceptance',
    title: t('tournament.stepper.acceptance'),
    icon: 'i-lucide-users'
  },
  ...Array.from({ length: numberOfRounds }, (_, i) => ({
    slot: `round-${i + 1}`,
    title: t('tournament.stepper.round', { n: i + 1 }),
    icon: 'i-lucide-swords'
  })),
  {
    slot: 'awards',
    title: t('tournament.stepper.awards'),
    icon: 'i-lucide-trophy'
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
      </UStepper>
    </template>
  </UDashboardPanel>
</template>
