<!-- app\components\tournaments\list\FiltersBar.vue -->
<!--
  Extracted out of tournaments/index.vue's #left toolbar slot (2026-08-16),
  same reasoning as wanted-cards/list/FiltersBar.vue — status filter, format
  dropdown, and the "manage formats" button, all replaced by
  TournamentsListBulkActionsBar while there's a selection (that toggle stays
  in the page, only this "no selection" content moved out).
-->
<script setup lang="ts">
interface StatusTab {
  label: string
  value: string
  count?: number
  icon?: string
}

interface FormatTab {
  label: string
  value: string
  count?: number
}

const { statusTabs, formatTabs } = defineProps<{
  statusTabs: StatusTab[]
  formatTabs: FormatTab[]
}>()

const statusFilter = defineModel<string>('statusFilter', { required: true })
const formatFilter = defineModel<string>('formatFilter', { required: true })
const showExternal = defineModel<boolean>('showExternal', { required: true })

const emit = defineEmits<{ openManageFormats: [] }>()
</script>

<template>
  <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

  <!-- Dropdown, not a StatusFilterGroup button row: format isn't a
     small fixed set like status (5 values) — it's whatever
     mtg_formats rows exist, up to the 8 the association actually
     runs (see app/utils/cittadino/cittadinoFormats.ts). A button per
     format alongside the status buttons would crowd/wrap the
     toolbar; a dropdown scales to that count the same way it
     already does for format selection in AddModal.vue.
     shrink-0/no flex-wrap: both children (w-40 select + an
     icon-only button) are small and fixed-width, so this pair
     never needs to wrap internally — the outer #tour-tournaments-
     filters row (flex-wrap) is what actually reflows on narrow
     screens, by moving this whole block to its own line. -->
  <div class="flex items-center gap-2 shrink-0">
    <USelectMenu
      v-model="formatFilter"
      :items="formatTabs"
      value-key="value"
      :placeholder="$t('tournament.filters.formatPlaceholder')"
      :icon="ICONS.gameplay"
      class="w-40"
    />

    <!-- External (shop-organized, not Pauperwave) tournaments are hidden
         from this list by default — see tournaments/index.vue's own
         comment on why — this toggles that filter back on. Placed right
         next to "Gestisci formati" per user request (2026-09-07). UTooltip
         wrap — same icon-only-button convention as EditIconButton.vue. -->
    <UTooltip
      :text="$t(showExternal
        ? 'tournament.filters.hideExternal'
        : 'tournament.filters.showExternal')"
    >
      <UButton
        :icon="showExternal ? ICONS.hide : ICONS.show"
        color="neutral"
        variant="outline"
        :aria-label="$t(showExternal
          ? 'tournament.filters.hideExternal'
          : 'tournament.filters.showExternal')"
        @click="showExternal = !showExternal"
      />
    </UTooltip>

    <UTooltip :text="$t('mtgFormat.manageModal.title')">
      <UButton
        :icon="ICONS.settingsGear"
        color="neutral"
        variant="outline"
        :aria-label="$t('mtgFormat.manageModal.title')"
        @click="emit('openManageFormats')"
      />
    </UTooltip>
  </div>
</template>
