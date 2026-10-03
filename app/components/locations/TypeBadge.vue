<!-- app\components\locations\TypeBadge.vue -->
<!-- Shop badge ("Negozio") shared by list/Card.vue, the list table columns and
     single/PresentationCard.vue (each had hand-rolled the same UBadge). Positioning (inline vs
     absolute corner overlay) is left to the caller via class fallthrough, like
     list/LocationStatus.vue. -->
<script setup lang="ts">
const { isShop } = defineProps<{ isShop: boolean }>()
const { t } = useI18n()
</script>

<template>
  <UBadge
    v-if="isShop"
    color="neutral"
    variant="subtle"
    :icon="ICONS.shop"
  >
    {{ t('location.card.shop') }}
  </UBadge>
</template>
