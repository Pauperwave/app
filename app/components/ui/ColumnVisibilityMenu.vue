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

// iconOnly: always icon-only regardless of viewport, instead of the default
// "collapses below lg" — opt-in for pages crowded enough that even the lg
// breakpoint isn't enough room (transactions/index.vue, user request,
// 2026-08-27, alongside DateRangePicker's own iconOnly).
const { items, iconOnly = false } = defineProps<{ items: DropdownMenuItem[], iconOnly?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <UTooltip v-if="iconOnly" :text="t('common.showColumns')">
    <UDropdownMenu :items="items" :content="{ align: 'end' }">
      <UButton
        color="neutral"
        variant="outline"
        :icon="ICONS.settingsColumns"
        :aria-label="t('common.showColumns')"
      />
    </UDropdownMenu>
  </UTooltip>
  <!-- text/content: same "only below lg" tooltip as TourStartButton.vue's
       own collapsing label — the button already shows its own text above
       that breakpoint. -->
  <UTooltip
    v-else
    :text="t('common.showColumns')"
    :ui="{ content: 'lg:hidden' }"
  >
    <UDropdownMenu
      :items="items"
      :content="{ align: 'end' }"
    >
      <UButton
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.settingsColumns"
        :aria-label="t('common.showColumns')"
      >
        <span class="hidden lg:inline">{{ t('common.showColumns') }}</span>
      </UButton>
    </UDropdownMenu>
  </UTooltip>
</template>
