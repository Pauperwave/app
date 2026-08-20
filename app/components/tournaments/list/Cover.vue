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
       image or ImageOffPlaceholder.vue up top, with the day/month tear-off
       badge overlaid on it instead of sitting beside the title — these cards are narrower
       (grid, not a full-width list), so a side-by-side date box would crowd
       the title at small widths. Negative margins (not UCard's #header
       slot): the outline variant's `ring ring-default` sits inset from the
       card's outer edge regardless of slot padding, and only the body
       slot's own negative margin — bleeding past its padding but staying
       inside the ring — avoids the ring reading as dark bars down the
       image's sides (confirmed 2026-08-16). -->
  <div class="relative -m-3 mb-3">
    <img
      v-if="tournament.image"
      :src="tournament.image"
      :alt="tournament.name"
      class="w-full h-32 object-cover"
    >
    <ImageOffPlaceholder v-else class="w-full h-32" icon-class="size-8" />

    <div class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0">
      <span class="text-base font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
    </div>

    <!-- Card name + artist/copyright attribution, required alongside any
         art_crop use per Scryfall's API usage guidelines — see
         CardArtPicker.vue's own comment. -->
    <UTooltip
      v-if="tournament.image && tournament.imageCardName"
      :text="tournament.imageCardArtist
        ? t('magic.cardArtPicker.attribution', {
          cardName: tournament.imageCardName, artist: tournament.imageCardArtist
        })
        : t('magic.cardArtPicker.attributionNoArtist', { cardName: tournament.imageCardName })"
    >
      <span class="absolute bottom-2 right-2 max-w-[75%] truncate rounded bg-default/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted">
        {{ tournament.imageCardName }}
      </span>
    </UTooltip>

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
