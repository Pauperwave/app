<!-- app\components\ui\RowActionsMenu.vue -->
<!-- The visible per-row "actions" column trigger (an ellipsis button + dropdown), fed the same
     DropdownMenuItem[] as a table's right-click context menu
     (rowContextMenuItems(row.original)), so there is one list of actions per domain, not two.
     It matches the visible-actions-column convention of leagues/locations/tournaments; the
     context menu stays, this just makes the actions discoverable without knowing right-click
     reveals something. -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  items: DropdownMenuItem[]
}>()
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      :icon="ICONS.ellipsisVertical"
      color="neutral"
      variant="ghost"
      size="xs"
      @click.stop
    />
  </UDropdownMenu>
</template>
