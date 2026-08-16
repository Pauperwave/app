<!-- app\components\locations\list\LocationStatus.vue -->
<script setup lang="ts">
const { temporarilyClosed } = defineProps<{ temporarilyClosed: boolean }>()
const { t } = useI18n()
</script>

<template>
  <UBadge
    v-if="temporarilyClosed"
    color="warning"
    variant="subtle"
    :icon="ICONS.warning"
    class="absolute top-2 right-2 z-10"
  >
    {{ t('location.card.temporarilyClosed') }}
  </UBadge>
</template>
