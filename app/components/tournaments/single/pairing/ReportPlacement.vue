<!-- app\components\tournaments\single\pairing\ReportPlacement.vue -->
<!-- A placement as icon + text ("1° posto"): a crown for the winner, a medal for everyone else. -->
<script setup lang="ts">
const { position } = defineProps<{
  position: number
}>()

const { t } = useI18n()

const isWinner = computed(() => position === 1)
</script>

<template>
  <span class="inline-flex items-center gap-1.5 font-medium">
    <UIcon
      :name="isWinner ? ICONS.crown : ICONS.medal"
      class="size-4"
      :class="isWinner ? 'text-warning' : 'text-muted'"
    />
    {{ t('tournament.single.roundManager.reportPlace', { position }) }}
  </span>
</template>
