<!-- app\components\ui\RowActionsMenu.vue -->
<!--
  Visible per-row "actions" column trigger — an ellipsis button + dropdown,
  fed the exact same DropdownMenuItem[] a table's right-click context menu
  already uses (rowContextMenuItems(row.original)), so there's one list of
  actions per domain, not two. Added 2026-08-18 for /associates and
  /wanted-cards to match the visible-actions-column convention already
  established by leagues/locations/tournaments — context menu stays too,
  this doesn't replace it, just makes the same actions discoverable without
  needing to already know right-click reveals something.
-->
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
