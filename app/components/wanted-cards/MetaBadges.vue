<!-- app\components\wanted-cards\MetaBadges.vue -->
<script setup lang="ts">
import type { WantedCard } from '~/types'

const { card } = defineProps<{ card: WantedCard }>()
const { t } = useI18n()
</script>

<template>
  <UBadge color="neutral" variant="subtle">
    {{ card.copies }}×
  </UBadge>
  <UBadge
    color="neutral"
    variant="subtle"
    :icon="card.language ? WANTED_CARD_LANGUAGE_ICONS[card.language] : 'i-lucide-languages'"
    class="gap-2"
  >
    {{ t(`wantedCard.languages.${card.language || 'any'}`) }}
  </UBadge>
  <UBadge
    v-for="treatment in card.treatment"
    :key="treatment"
    color="neutral"
    variant="subtle"
  >
    {{ t(`wantedCard.treatments.${treatment}`) }}
  </UBadge>
</template>
