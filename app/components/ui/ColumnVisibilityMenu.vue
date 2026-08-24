<!-- app\components\ui\ColumnVisibilityMenu.vue -->
<!--
  The "Mostra colonne" dropdown trigger shared by every list page's column-
  visibility menu (transactions, players, wanted-cards, associates/requests
  via AssociatesTableToolbarActions) — same UDropdownMenu + UButton shape,
  previously duplicated four times. Label collapses to icon-only below `lg`,
  same "molto prima" breakpoint as StatusFilterGroup's own icon items (user
  request, 2026-08-24) — done here once so every caller gets it for free.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ items: DropdownMenuItem[] }>()
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      :trailing-icon="ICONS.settingsColumns"
    >
      <span class="hidden lg:inline">{{ $t('common.showColumns') }}</span>
    </UButton>
  </UDropdownMenu>
</template>
