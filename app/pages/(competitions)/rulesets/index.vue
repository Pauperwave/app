<!-- app\pages\(competitions)\rulesets\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

const { t } = useI18n()

// Rules are rendered from the same constants the standings are scored with, so
// the published regulation cannot drift from what /standings/cittadino actually
// computes.
const pointRows = computed(() => [
  ...CITTADINO_POINTS_BY_RANK.map((points, index) => ({
    place: `${index + 1}°`,
    points
  })),
  {
    place: `${CITTADINO_POINTS_BY_RANK.length + 1}°+`,
    points: CITTADINO_MIN_POINTS
  }
])

const tabs = computed<TabsItem[]>(() => [
  { label: t('ruleset.tabs.cittadino'), value: 'cittadino', slot: 'cittadino' },
  { label: t('ruleset.tabs.commander'), value: 'commander', slot: 'commander' },
  { label: t('ruleset.tabs.premodern'), value: 'premodern', slot: 'premodern' },
  { label: t('ruleset.tabs.pauper'), value: 'pauper', slot: 'pauper' }
])

const activeTab = ref('cittadino')
</script>

<template>
  <UDashboardPanel id="rulesets">
    <template #header>
      <UDashboardNavbar :title="$t('ruleset.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTabs
        v-model="activeTab"
        :items="tabs"
        variant="link"
        class="w-full"
      >
        <template #cittadino>
          <UPageCard
            :title="$t('ruleset.cittadino.title')"
            :description="$t('ruleset.cittadino.description')"
            icon="i-lucide-medal"
          >
            <div class="flex flex-col gap-6">
              <div>
                <p class="mb-2 text-sm font-medium text-highlighted">
                  {{ $t('ruleset.cittadino.pointsTitle') }}
                </p>

                <div class="flex flex-wrap gap-1.5">
                  <div
                    v-for="row in pointRows"
                    :key="row.place"
                    class="flex flex-col items-center rounded-lg border border-default px-3 py-1.5"
                  >
                    <span class="text-xs text-muted">{{ row.place }}</span>
                    <span class="text-sm font-semibold text-highlighted tabular-nums">
                      {{ row.points }}
                    </span>
                  </div>
                </div>
              </div>

              <USeparator />

              <ul class="flex flex-col gap-3 text-sm text-muted">
                <li class="flex gap-2">
                  <UIcon name="i-lucide-calculator" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {{ $t('ruleset.cittadino.bestResults', {
                      counted: CITTADINO_COUNTED_RESULTS
                    }) }}
                  </span>
                </li>
                <li class="flex gap-2">
                  <UIcon name="i-lucide-git-compare-arrows" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.cittadino.tieBreak') }}</span>
                </li>
                <li class="flex gap-2">
                  <UIcon name="i-lucide-trophy" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {{ $t('ruleset.cittadino.finalists', { finalists: CITTADINO_FINALISTS }) }}
                  </span>
                </li>
                <li class="flex gap-2">
                  <UIcon name="i-lucide-calendar-check" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.cittadino.eligibility') }}</span>
                </li>
                <li class="flex gap-2">
                  <UIcon name="i-lucide-megaphone" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.cittadino.publication') }}</span>
                </li>
              </ul>

              <USeparator />

              <p class="text-xs text-muted">
                {{ $t('ruleset.cittadino.legend') }}
              </p>
            </div>
          </UPageCard>
        </template>

        <template #commander>
          <RulesetsFormatRulesCard format="commander" />
        </template>

        <template #premodern>
          <RulesetsFormatRulesCard format="premodern" />
        </template>

        <template #pauper>
          <RulesetsFormatRulesCard format="pauper" />
        </template>
      </UTabs>
    </template>
  </UDashboardPanel>
</template>
