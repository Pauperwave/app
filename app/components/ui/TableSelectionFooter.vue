<!-- app\components\ui\TableSelectionFooter.vue -->
<!--
  Shared by associates/index.vue and associates/requests.vue (fallow dupes,
  2026-08-12): the "N of M selected" row under a UTable, identical on both.
-->
<script setup lang="ts">
interface Props {
  selected: number
  total: number
}

const { selected, total } = defineProps<Props>()
</script>

<template>
  <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
    <div class="text-sm text-muted">
      {{ $t('associate.selectedRows', { selected, total }) }}
    </div>
  </div>
</template>
