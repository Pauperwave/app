<!-- app\components\locations\list\GridView.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Location } from '~/types'

const {
  locations, contextMenuItems, onEdit, loading = false, loadingCount = 6
} = defineProps<{
  locations: Location[]
  contextMenuItems: (location: Location) => DropdownMenuItem[]
  onEdit: (location: Location) => void
  /** Renders `loadingCount` skeleton cards instead of `locations` — see
   * Card.vue's own `loading` prop. @default false */
  loading?: boolean
  loadingCount?: number
}>()
</script>

<template>
  <div v-if="loading" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <LocationsListCard v-for="n in loadingCount" :key="n" loading />
  </div>

  <EmptyState
    v-else-if="!locations.length"
    :message="$t('location.grid.empty')"
  />

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <LocationsListCard
      v-for="location in locations"
      :key="location.id"
      :location="location"
      :context-menu-items="contextMenuItems"
      :on-edit="onEdit"
    />
  </div>
</template>
