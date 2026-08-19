<!-- app\components\ui\ConsentBadge.vue -->
<!--
  Extracted out of useAssociatesRenderers.ts's renderConsentBadge (2026-08-19)
  so the same Sì/No badge can be used both as a table cell (h(ConsentBadge,
  { value })) and directly in a template (associate/[slug].vue's consensi
  section) — a plain renderer function only worked inside h()-based column
  defs, not template markup.
-->
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
