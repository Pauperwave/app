<!-- app\components\ui\ColumnVisibilityMenu.vue -->
<!-- The "Mostra colonne" dropdown trigger shared by every list page's column-visibility menu
     (transactions, players, wanted-cards, associates/requests via
     AssociatesTableToolbarActions): the same UDropdownMenu + UButton shape, previously
     duplicated four times. The label collapses to icon-only below `lg` (the "molto prima"
     breakpoint of StatusFilterGroup's icon items), done here once. -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

// iconOnly: always icon-only regardless of viewport, instead of the default "collapses below lg":
// opt-in for pages crowded enough that even lg isn't enough room (transactions/index.vue, with
// DateRangePicker's iconOnly)
const {
  items,
  iconOnly = false
} = defineProps<{
  items: DropdownMenuItem[]
  iconOnly?: boolean
}>()
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
  <!-- text/content: the same "only below lg" tooltip as TourStartButton.vue's collapsing label
       (the button shows its own text above that breakpoint) -->
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
