<!-- app\components\wanted-cards\list\ViewControls.vue -->
<!--
  Extracted out of wanted-cards/index.vue's #right toolbar slot (2026-08-16)
  — see FiltersBar.vue's own header for why.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const {
  viewMode, gridSortItems, isGrouped, viewItems
} = defineProps<{
  viewMode: 'table' | 'grid' | 'dense'
  gridSortItems: { label: string, value: string }[]
  isGrouped: boolean
  viewItems: DropdownMenuItem[]
}>()

const gridSortField = defineModel<string>('gridSortField', { required: true })
const gridSortDesc = defineModel<boolean>('gridSortDesc', { required: true })

const emit = defineEmits<{ toggleGrouping: [] }>()

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

  <UButton
    :label="$t('wantedCard.filters.groupByPlayer')"
    :icon="ICONS.players"
    color="neutral"
    :variant="isGrouped ? 'solid' : 'outline'"
    @click="emit('toggleGrouping')"
  />

  <ColumnVisibilityMenu v-if="viewMode === 'table'" :items="viewItems" />
</template>
