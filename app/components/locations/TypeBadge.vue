<!-- app\components\locations\TypeBadge.vue -->
<!--
  Shop badge ("Negozio") shared by list/Card.vue, list table columns, and
  single/PresentationCard.vue (2026-09-04) — those three had each hand-rolled
  the same UBadge. Positioning (inline vs. absolute corner overlay) is left
  to the caller via class fallthrough, same convention as list/LocationStatus.vue.
-->
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
