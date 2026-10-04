<!-- app\components\rulesets\DraftCard.vue -->
<!-- Draft has no points-based championship (only Cittadino/Commander/Premodern/Pauper do, via
     FormatRulesCard), so it gets a lighter structure-only card instead of sharing that one. -->
<template>
  <UPageCard
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
          <UIcon :name="ICONS.package" class="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{{ $t('ruleset.draft.boosters') }}</span>
        </li>
        <li class="flex gap-2">
          <UIcon :name="ICONS.players" class="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{{ $t('ruleset.draft.pods') }}</span>
        </li>
      </ul>
    </div>
  </UPageCard>
</template>
