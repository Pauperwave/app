<!-- app\components\rulesets\FormatRulesCard.vue -->
<script setup lang="ts">
// Mirrors the mock leagues in server/api/standings/[format].get.ts, for display
// only — this component doesn't fetch, it just documents what that endpoint
// encodes. Only Commander's numbers are a real, confirmed regulation
// (2026-08-09); Premodern and Pauper reuse them as a placeholder until their own
// rules exist.
interface FormatLeagueSummary {
  name: string
  events: number
  counted: number
  top: number
}

interface FormatRules {
  label: string
  confirmed: boolean
  leagues: FormatLeagueSummary[]
  participationPoints: number
}

export type StandingsFormat = 'commander' | 'premodern' | 'pauper'

const SHARED_LEAGUES: FormatLeagueSummary[] = [
  { name: 'Lega Estiva 2025', events: 4, counted: 3, top: 6 },
  { name: 'Lega Invernale 2026', events: 6, counted: 4, top: 8 },
  { name: 'Lega Estiva 2026', events: 5, counted: 4, top: 8 }
]

const FORMAT_RULES: Record<StandingsFormat, FormatRules> = {
  commander: {
    label: 'Commander', confirmed: true, leagues: SHARED_LEAGUES, participationPoints: 1
  },
  premodern: {
    label: 'Premodern', confirmed: false, leagues: SHARED_LEAGUES, participationPoints: 1
  },
  pauper: {
    label: 'Pauper', confirmed: false, leagues: SHARED_LEAGUES, participationPoints: 1
  }
}

const { format } = defineProps<{ format: StandingsFormat }>()

const rules = computed(() => FORMAT_RULES[format])
</script>

<template>
  <UPageCard
    :title="rules.label"
    :description="$t('ruleset.format.description')"
    icon="i-lucide-medal"
  >
    <div class="flex flex-col gap-6">
      <UAlert
        v-if="!rules.confirmed"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="$t('ruleset.format.placeholderNotice', { format: rules.label })"
      />

      <div>
        <p class="mb-1 text-sm font-medium text-highlighted">
          {{ $t('ruleset.format.structureTitle') }}
        </p>
        <p class="text-sm text-muted">
          {{ $t('ruleset.format.structure', { format: rules.label }) }}
        </p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-highlighted">
          {{ $t('ruleset.format.ownRulesTitle') }}
        </p>
        <p class="text-sm text-muted">
          {{ $t('ruleset.format.ownRules') }}
        </p>
      </div>

      <USeparator />

      <div>
        <p class="mb-2 text-sm font-medium text-highlighted">
          {{ $t('ruleset.format.leaguesTitle') }}
        </p>
        <ul class="flex flex-col gap-2 text-sm text-muted">
          <li
            v-for="league in rules.leagues"
            :key="league.name"
            class="flex gap-2"
          >
            <UIcon name="i-lucide-calendar-range" class="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span class="font-medium text-highlighted">{{ league.name }}</span> —
              {{ $t('ruleset.format.leagueSummary', {
                events: league.events, counted: league.counted, top: league.top
              }) }}
            </span>
          </li>
        </ul>
      </div>

      <USeparator />

      <p class="text-sm text-muted">
        {{ $t('ruleset.format.pointsNote') }}
      </p>

      <p class="text-sm text-muted">
        {{ $t('ruleset.format.participationNote', { points: rules.participationPoints }) }}
      </p>

      <USeparator />

      <div class="flex gap-2">
        <UIcon name="i-lucide-sparkles" class="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p class="text-sm font-medium text-highlighted">
            {{ $t('ruleset.format.automationTitle') }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('ruleset.format.automationNote') }}
          </p>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
