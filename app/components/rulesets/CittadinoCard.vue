<!-- app\components\rulesets\CittadinoCard.vue -->
<script lang="ts" setup>
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
</script>

<template>
  <UPageCard
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
          <UIcon :name="ICONS.total" class="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {{ $t('ruleset.cittadino.bestResults', {
              counted: CITTADINO_COUNTED_RESULTS
            }) }}
          </span>
        </li>
        <li class="flex gap-2">
          <UIcon :name="ICONS.compareArrows" class="mt-0.5 size-4 shrink-0 text-primary" />
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
          <UIcon :name="ICONS.megaphone" class="mt-0.5 size-4 shrink-0 text-primary" />
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
