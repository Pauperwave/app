<!-- app\components\ui\ConsentBadge.vue -->
<!-- Extracted from useAssociatesRenderers.ts's renderConsentBadge so the same Sì/No badge works
     as a table cell (h(ConsentBadge, { value })) and directly in a template
     (associate/[slug].vue's consensi section): a plain renderer function only worked inside
     h()-based column defs. -->
<script setup lang="ts">
const { value } = defineProps<{ value: boolean }>()
</script>

<template>
  <UBadge
    variant="subtle"
    class="w-[60px]"
    :color="value ? 'success' : 'error'"
    :icon="value ? ICONS.success : ICONS.clear"
    :label="value ? $t('common.yes') : $t('common.no')"
  />
</template>
