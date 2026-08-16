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
  viewMode: 'table' | 'grid'
  gridSortItems: { label: string, value: string }[]
  isGrouped: boolean
  viewItems: DropdownMenuItem[]
}>()

const gridSortField = defineModel<string>('gridSortField', { required: true })
const gridSortDesc = defineModel<boolean>('gridSortDesc', { required: true })

const emit = defineEmits<{ toggleGrouping: [] }>()
</script>

<template>
  <div v-if="viewMode === 'grid'" class="flex items-center gap-2">
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

  <UDropdownMenu
    v-if="viewMode === 'table'"
    :items="viewItems"
    :content="{ align: 'end' }"
  >
    <UButton
      :label="$t('common.showColumns')"
      color="neutral"
      variant="outline"
      :trailing-icon="ICONS.settingsColumns"
    />
  </UDropdownMenu>
</template>
