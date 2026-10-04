<!-- app\components\rulesets\SealedCard.vue -->
<!-- A plain placeholder until Sealed's rules exist (no points-based championship either, see
     DraftCard.vue). -->
<template>
  <UPageCard
    :title="$t('ruleset.sealed.title')"
    :description="$t('ruleset.sealed.description')"
    :icon="ICONS.gameplay"
  >
    <UAlert
      color="warning"
      variant="subtle"
      :icon="ICONS.warning"
      :description="$t('ruleset.sealed.placeholderNotice')"
    />
  </UPageCard>
</template>
