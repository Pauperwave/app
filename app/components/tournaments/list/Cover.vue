<!-- app\components\tournaments\list\Cover.vue -->
<!--
  Extracted out of Card.vue (2026-08-16) — the densest, most interaction-heavy
  block of the card (image, day/month chip, status dot, selection checkbox
  with its own shift-click capture), isolated from the rest of the card's
  layout for SRP.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const { tournament, selection, range } = defineProps<{
  tournament: Tournament
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range: number[]
}>()

const { t } = useI18n()

// Captured from the checkbox's own native `click` (fires synchronously
// before the `update:modelValue` it triggers) so a shift-click can be told
// apart from a plain one — same convention as useTournamentsTableColumns.ts.
const lastClickShiftKey = ref(false)

function dayPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit' })
}

function monthPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
}
</script>

<template>
  <!-- Luma-inspired cover, same convention as calendar/card/Base.vue: a real
       or default image up top, with the day/month tear-off badge overlaid on
       it instead of sitting beside the title — these cards are narrower
       (grid, not a full-width list), so a side-by-side date box would crowd
       the title at small widths. Negative margins (not UCard's #header
       slot): the outline variant's `ring ring-default` sits inset from the
       card's outer edge regardless of slot padding, and only the body
       slot's own negative margin — bleeding past its padding but staying
       inside the ring — avoids the ring reading as dark bars down the
       image's sides (confirmed 2026-08-16). -->
  <div class="relative -m-3 mb-3">
    <img
      :src="tournament.image ?? DEFAULT_CALENDAR_COVER_IMAGE"
      :alt="tournament.name"
      class="w-full h-32 object-cover"
    >

    <div class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0">
      <span class="text-base font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
    </div>

    <!-- Status is shown through the card's own styling, not a badge (same
         convention as calendar/card/Base.vue): completed cards recede via
         opacity/saturation above, canceled is a strikethrough+error title
         below, ongoing gets a pulsing dot. Scheduled is the default look.
         Sits left of the checkbox at a fixed offset (not jumping) since
         the checkbox's own position stays reserved even while hidden. -->
    <span
      v-if="tournament.status === 'in_progress'"
      class="absolute top-3 right-11 size-2.5 rounded-full bg-warning shrink-0 animate-pulse motion-reduce:animate-none"
      :title="t('tournament.status.in_progress')"
    />

    <!-- Hidden until hover, except once selected — same convention as
         WantedCardsListGridView.vue's card checkbox. `group-hover` targets
         the ancestor `.group` class on Card.vue's UCard, unaffected by this
         component boundary. -->
    <UCheckbox
      :model-value="selection.isSelected(tournament.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(tournament.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection.toggle(
        tournament.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />
  </div>
</template>
