<!-- app\components\home\QuickCreateMenu.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const quickCreateItems = useQuickCreateItems()

// Two groups (Community, Competitions — see useQuickCreateItems.ts's `group`
// field), not one flat list: UDropdownMenu renders a divider between
// sub-arrays, same domain split as the sidebar nav (2026-08-19 user request).
const items = computed<DropdownMenuItem[][]>(() => [
  quickCreateItems.filter(item => item.group === 'community'),
  quickCreateItems.filter(item => item.group === 'competitions')
])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      :icon="ICONS.add"
      size="md"
      class="rounded-lg"
    />
  </UDropdownMenu>
</template>
