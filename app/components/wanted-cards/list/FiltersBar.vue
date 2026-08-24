<!-- app\components\wanted-cards\list\FiltersBar.vue -->
<!--
  Extracted out of wanted-cards/index.vue's #left toolbar slot (2026-08-16,
  fallow:health flagged the page's whole <template> as high-complexity —
  most of it was branching spread across this filters block, the view
  controls block, and the two confirm modals; see ViewControls.vue and
  ConfirmModals.vue for the other two).
-->
<script setup lang="ts">
import type { Associate } from '~/types'
import type { ColorTab, WantedCardColorFilter } from '~/composables/wantedCards/useWantedCardsFilters'

const {
  statusTabs,
  colorTabs,
  isColorTabActive,
  currentAssociate
} = defineProps<{
  statusTabs: { label: string, value: string, count?: number, icon?: string }[]
  colorTabs: ColorTab[]
  isColorTabActive: (value: WantedCardColorFilter) => boolean
  currentAssociate: Associate | null
}>()

const statusFilter = defineModel<string>('statusFilter', { required: true })
const onlyMine = defineModel<boolean>('onlyMine', { required: true })

const emit = defineEmits<{ toggleColor: [value: WantedCardColorFilter] }>()
</script>

<template>
  <!--
    No `-ms-1` here on purpose: it's for icon-only buttons (see
    transactions/index.vue), not a bordered UFieldGroup — measured,
    it already aligns with the table (105px vs 106px) without it.
  -->
  <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

  <!-- Search by card name hidden for now: this view serves people
       looking for cards, not people selling them (which is the real
       use case for search by name) — see the TODO in docs/TODO.md. -->

  <!-- Replaces the old language select + foil toggle (2026-08-15 user
       request) — mana-symbol tabs instead of StatusFilterGroup, since a
       mana symbol isn't an icon name StatusFilterGroup's icon prop can
       take. Multi-select (2026-08-15 follow-up): several tabs stay active
       together (toggleColorFilter), "Tutte" resets back to none. -->
  <UFieldGroup>
    <UButton
      v-for="option in colorTabs"
      :key="option.value"
      color="neutral"
      :variant="isColorTabActive(option.value) ? 'solid' : 'outline'"
      @click="emit('toggleColor', option.value)"
    >
      <span v-if="option.value === 'all'">{{ option.label }}</span>
      <MagicManaCost v-else :mana-cost="option.manaCost" :aria-label="option.label" />
    </UButton>
  </UFieldGroup>

  <UTooltip
    :text="!currentAssociate ? $t('wantedCard.filters.onlyMineUnavailable') : undefined"
  >
    <UButton
      :label="$t('wantedCard.filters.onlyMine')"
      icon="i-lucide-user-round"
      color="neutral"
      :variant="onlyMine ? 'solid' : 'outline'"
      :disabled="!currentAssociate"
      @click="onlyMine = !onlyMine"
    />
  </UTooltip>
</template>
