<!-- app\pages\index.vue -->
<!--
  Role-differentiated Home (docs/PROGRESS.md ADR pending, 2026-08-19 "Home"
  conversation): a thin entry point that decides *which* dashboard to render
  (HomeStaff vs HomePlayer), owning none of the content itself. Shared chrome
  (navbar, quick-create, notifications bell, tour) stays here rather than
  duplicated into both dashboards.
-->
<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({ title: () => t('nav.dashboard') })

const { isStaff, status } = useUserRole()

// Role not resolved yet (still fetching, or no session) — render neither
// dashboard rather than guessing, to avoid a flash of the wrong one.
const roleReady = computed(() => status.value === 'success')

const tour = useHomeTour(isStaff)
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :title="$t('nav.dashboard')" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :label="$t('home.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <template v-if="isStaff">
            <USeparator orientation="vertical" class="h-4" />

            <div id="tour-home-quick-create">
              <HomeQuickCreateMenu />
            </div>
          </template>

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <HomeStaff v-if="roleReady && isStaff" />
      <HomePlayer v-else-if="roleReady" />
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
