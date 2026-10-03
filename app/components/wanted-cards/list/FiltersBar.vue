<!-- app\components\wanted-cards\list\FiltersBar.vue -->
<!-- Extracted from wanted-cards/index.vue's #left toolbar slot (fallow:health flagged the
     page's whole <template> as high-complexity: most of it was branching across this filters
     block, the view controls block and the two confirm modals; see ViewControls.vue and
     ConfirmModals.vue for the other two). -->
<script setup lang="ts">
import type { Associate } from '~/types'
import type { ColorTab, WantedCardColorFilter } from '~/composables/wantedCards/useWantedCardsFilters'

const {
  statusTabs,
  colorTabs,
  isColorTabActive,
  currentAssociate,
  isGrouped
} = defineProps<{
  statusTabs: { label: string, value: string, count?: number, icon?: string }[]
  colorTabs: ColorTab[]
  isColorTabActive: (value: WantedCardColorFilter) => boolean
  currentAssociate: Associate | null
  isGrouped: boolean
}>()

const statusFilter = defineModel<string>('statusFilter', { required: true })
// "Le mie richieste" + "Raggruppa per giocatore" sit together here, not split across the
// filters/view-controls halves: both are genuinely filters (which rows show / how they cluster), on
// the left like "Le mie richieste" always was
const onlyMine = defineModel<boolean>('onlyMine', { required: true })

const emit = defineEmits<{ toggleColor: [value: WantedCardColorFilter], toggleGrouping: [] }>()
</script>

<template>
  <!-- No `-ms-1` here on purpose: it's for icon-only buttons (see transactions/index.vue), not
       a bordered UFieldGroup: measured, it already aligns with the table (105px vs 106px)
       without it. -->
  <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

  <!-- Search by card name deliberately omitted: this view serves people looking for cards, not
       people selling them (the real use case for searching by name) -->

  <!-- Replaces the old language select + foil toggle: mana-symbol tabs instead of
       StatusFilterGroup, since a mana symbol isn't an icon name its icon prop can take.
       Multi-select: several tabs stay active together (toggleColorFilter), "Tutte" resets to
       none -->
  <UFieldGroup>
    <UButton
      v-for="option in colorTabs"
      :key="option.value"
      color="neutral"
      :variant="isColorTabActive(option.value) ? 'solid' : 'outline'"
      @click="emit('toggleColor', option.value)"
    >
      <span v-if="option.value === 'all'">{{ option.label }}</span>
      <MagicManaCost
        v-else
        :mana-cost="option.manaCost"
        :aria-label="option.label"
      />
    </UButton>
  </UFieldGroup>

  <span class="flex items-center gap-2">
    <UTooltip
      :text="!currentAssociate ? $t('wantedCard.filters.onlyMineUnavailable') : undefined"
    >
      <UButton
        :label="$t('wantedCard.filters.onlyMine')"
        :icon="ICONS.userRound"
        color="neutral"
        :variant="onlyMine ? 'solid' : 'outline'"
        :disabled="!currentAssociate"
        @click="onlyMine = !onlyMine"
      />
    </UTooltip>

    <GroupByToggleButton
      :label="$t('wantedCard.filters.groupByPlayer')"
      :grouped="isGrouped"
      @toggle="emit('toggleGrouping')"
    />
  </span>
</template>
