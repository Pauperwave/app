<!-- app\components\wanted-cards\list\ViewControls.vue -->
<!--
  Extracted out of wanted-cards/index.vue's #right toolbar slot (2026-08-16)
  — see FiltersBar.vue's own header for why. "Le mie richieste" and
  "Raggruppa per giocatore" live in FiltersBar.vue instead (2026-08-29,
  user request) — both are filters (which rows show / how they're
  clustered), not view controls, so they belong on the left with the rest
  of the filters rather than here.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const {
  viewMode, gridSortItems, viewItems
} = defineProps<{
  viewMode: 'table' | 'grid' | 'dense'
  gridSortItems: { label: string, value: string }[]
  viewItems: DropdownMenuItem[]
}>()

const gridSortField = defineModel<string>('gridSortField', { required: true })
const gridSortDesc = defineModel<boolean>('gridSortDesc', { required: true })

// Dense shares grid's own sort state (wanted-cards/index.vue's gridSections
// computed feeds both views identically) — same sort control for either.
const showGridSort = computed(() => viewMode === 'grid' || viewMode === 'dense')
</script>

<template>
  <div v-if="showGridSort" class="flex items-center gap-2">
    <USelectMenu
      v-model="gridSortField"
      :items="gridSortItems"
      value-key="value"
      :placeholder="$t('wantedCard.grid.sortBy')"
      class="w-40"
    />
    <UButton
      :icon="gridSortDesc
        ? ICONS.sortDescNumeric
        : ICONS.sortAscNumeric"
      color="neutral"
      variant="outline"
      @click="gridSortDesc = !gridSortDesc"
    />
  </div>

  <ColumnVisibilityMenu v-if="viewMode === 'table'" :items="viewItems" />
</template>
