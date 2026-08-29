<!-- app\pages\(competitions)\rulesets\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

// Was nav-hidden only (sidebar gated on manage-rulesets, the route itself
// wide open to any authenticated user) — closed 2026-08-29, see the
// permissions.vue table's own statusNote on why this was flagged.
definePageMeta({ permission: 'manage-rulesets' })

const { t } = useI18n()

useSeoMeta({ title: () => t('ruleset.breadcrumb') })

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

// No `slot` per item: with :content="false" below, UTabs renders only the
// trigger strip — the panel for the active tab is rendered separately in #body,
// same split as /standings/cittadino's edition tabs.
const tabs = computed<TabsItem[]>(() => [
  { label: t('ruleset.tabs.cittadino'), value: 'cittadino' },
  { label: t('ruleset.tabs.commander'), value: 'commander' },
  { label: t('ruleset.tabs.premodern'), value: 'premodern' },
  { label: t('ruleset.tabs.pauper'), value: 'pauper' },
  { label: t('ruleset.tabs.draft'), value: 'draft' },
  { label: t('ruleset.tabs.sealed'), value: 'sealed' }
])

const activeTab = ref('cittadino')

const tour = useRulesetsTour()
</script>

<template>
  <UDashboardPanel id="rulesets">
    <template #header>
      <UDashboardNavbar :title="$t('ruleset.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :label="$t('ruleset.tour.startButton')"
            icon="i-lucide-circle-help"
            color="neutral"
            variant="ghost"
            @click="tour.start()"
          />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <div id="tour-rulesets-tabs" class="w-fit">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            variant="link"
            class="w-full"
            :content="false"
          />
        </div>

        <div id="tour-rulesets-content">
          <UPageCard
            v-if="activeTab === 'cittadino'"
            :title="$t('ruleset.cittadino.title')"
            :description="$t('ruleset.cittadino.description')"
            :icon="ICONS.medal"
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
                  <UIcon :name="ICONS.standings" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {{ $t('ruleset.cittadino.finalists', { finalists: CITTADINO_FINALISTS }) }}
                  </span>
                </li>
                <li class="flex gap-2">
                  <UIcon :name="ICONS.calendarCheck" class="mt-0.5 size-4 shrink-0 text-primary" />
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

          <RulesetsFormatRulesCard v-else-if="activeTab === 'commander'" format="commander" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'premodern'" format="premodern" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'pauper'" format="pauper" />

          <!-- Draft/Sealed have no points-based championship (only
               Cittadino/Commander/Premodern/Pauper do, via
               RulesetsFormatRulesCard), so they don't share that component
               — Draft gets its own lighter structure-only card, Sealed a
               plain placeholder until its own rules exist (user request,
               2026-08-23). -->
          <UPageCard
            v-else-if="activeTab === 'draft'"
            :title="$t('ruleset.draft.title')"
            :description="$t('ruleset.draft.description')"
            :icon="ICONS.gameplay"
          >
            <div class="flex flex-col gap-6">
              <div>
                <p class="mb-1 text-sm font-medium text-highlighted">
                  {{ $t('ruleset.draft.structureTitle') }}
                </p>
                <p class="text-sm text-muted">
                  {{ $t('ruleset.draft.structure') }}
                </p>
              </div>

              <USeparator />

              <ul class="flex flex-col gap-3 text-sm text-muted">
                <li class="flex gap-2">
                  <UIcon name="i-lucide-package" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.draft.boosters') }}</span>
                </li>
                <li class="flex gap-2">
                  <UIcon name="i-lucide-users" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.draft.pods') }}</span>
                </li>
              </ul>
            </div>
          </UPageCard>

          <UPageCard
            v-else-if="activeTab === 'sealed'"
            :title="$t('ruleset.sealed.title')"
            :description="$t('ruleset.sealed.description')"
            :icon="ICONS.gameplay"
          >
            <UAlert
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
              :description="$t('ruleset.sealed.placeholderNotice')"
            />
          </UPageCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
