<!-- app\components\tournaments\single\pairing\ReportPlacement.vue -->
<!-- A placement as icon + text ("1° posto"), in the shared podium look (podiumStyle.ts). -->
<script setup lang="ts">
const { position } = defineProps<{
  position: number
}>()

const { t } = useI18n()

const style = computed(() => podiumStyle(position))
</script>

<template>
  <span class="inline-flex items-center gap-1.5 font-medium">
    <UIcon
      :name="style.icon"
      class="size-4"
      :class="style.textClass"
    />
    {{ t('tournament.single.roundManager.reportPlace', { position }) }}
  </span>
</template>
