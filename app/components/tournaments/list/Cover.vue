<!-- app\components\tournaments\list\Cover.vue -->
<!--
  Extracted out of Card.vue (2026-08-16) — the densest, most interaction-heavy
  block of the card (image, day/month chip, status dot, selection checkbox
  with its own shift-click capture), isolated from the rest of the card's
  layout for SRP.

  `loading` (2026-08-22): renders a skeleton placeholder for every piece
  instead of a separate ListSkeleton.vue duplicating this markup by hand —
  that duplication was the actual root cause of a long back-and-forth
  getting a standalone skeleton to pixel-match this component (missed
  chips, wrong badge shape, wrong reserved heights). One shell, content
  swapped per element, so nothing can structurally drift again.
-->
<script setup lang="ts">
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  // fallow-ignore-next-line code-duplication -- see events/list/Cover.vue
  tournament = null, selection, range = [], loading = false
} = defineProps<{
  tournament?: Tournament | null
  selection?: Selection<number>
  range?: number[]
  loading?: boolean
}>()

const { t } = useI18n()

// Same shift-click capture convention as TournamentsListCover.vue.
const lastClickShiftKey = ref(false)

function dayPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit' })
}

function monthPart(startDate: string) {
  return new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
}
</script>

<template>
  <div class="relative -m-3 mb-3">
    <template v-if="!loading && tournament">
      <NuxtImg
        v-if="tournament.image"
        :src="tournament.image"
        :alt="tournament.name"
        format="webp"
        width="640"
        height="128"
        class="w-full h-32 object-cover"
      />
      <ImageOffPlaceholder v-else class="w-full h-32" icon-class="size-8" />
    </template>
    <USkeleton v-else class="w-full h-32 rounded-none" />

    <div
      v-if="!loading && tournament"
      class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0"
    >
      <span class="text-base font-bold leading-none">{{ dayPart(tournament.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(tournament.startDate) }}</span>
    </div>
    <!-- Solid black (not the default pulsing theme color) so it reads as a
         distinct chip sitting on the cover skeleton behind it. -->
    <USkeleton v-else class="absolute top-2 left-2 w-12 h-12 rounded-lg" :ui="{ base: 'bg-black' }" />

    <!-- Card-art attribution chip (required alongside any Scryfall art_crop
         use, see CardArtPicker.vue) — only when set, so no v-else pair with
         the skeleton branch: a real card with no attribution shows neither. -->
    <UTooltip
      v-if="!loading && tournament && tournament.image && tournament.imageCardName"
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
    <USkeleton v-else-if="loading" class="absolute bottom-2 right-2 w-24 h-4 rounded" :ui="{ base: 'bg-black' }" />

    <!-- Hidden until hover, except once selected — same convention as
         WantedCardsListGridView.vue's card checkbox. `group-hover` targets
         the ancestor `.group` class on Card.vue's UCard, unaffected by this
         component boundary. No loading counterpart: it's opacity-0 by
         default anyway, so there's nothing to reserve space for. -->
    <UCheckbox
      v-if="!loading && tournament && selection"
      :model-value="selection.isSelected(tournament.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(tournament.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection!.toggle(
        tournament.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />
  </div>
</template>
