<!-- app\components\locations\list\GridView.vue -->
<script setup lang="ts">
import type { Location } from '~/types'

defineProps<{
  locations: Location[]
  onEdit: (location: Location) => void
}>()
</script>

<template>
  <div v-if="!locations.length" class="text-center py-12 text-muted">
    {{ $t('location.grid.empty') }}
  </div>

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <LocationsListCard
      v-for="location in locations"
      :key="location.id"
      :location="location"
      :on-edit="onEdit"
    />
  </div>
</template>
