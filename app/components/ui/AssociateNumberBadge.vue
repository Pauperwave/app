<!-- app\components\ui\AssociateNumberBadge.vue -->
<!-- The PW-XXXX membership number ("tessera"), as a badge — extracted from
associate/[slug].vue's own header badge so the roster table column
(useAssociatesTableColumns.ts) renders the exact same thing instead of
plain text. -->
<script setup lang="ts">
const { number } = defineProps<{ number: string | null }>()
</script>

<template>
  <UBadge
    v-if="number"
    color="neutral"
    variant="subtle"
    :icon="ICONS.idCard"
    class="tabular-nums"
  >
    {{ number }}
  </UBadge>
</template>
