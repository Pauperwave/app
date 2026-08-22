<!-- app\components\leagues\list\Cover.vue -->
<!--
  Leagues' own version of TournamentsListCover.vue (2026-08-16, "make the
  leagues cards match the tournaments cards") — same image/date-chip/
  checkbox layout, adapted to League's fields. `league.image` was added
  2026-08-16 (see the ADR in docs/PROGRESS.md on the tournaments-cascade
  behavior) — falls back to ImageOffPlaceholder.vue when unset.

  `loading` (2026-08-22): same per-element real-vs-USkeleton branching as
  TournamentsListCover.vue — see Card.vue's own comment for why.
-->
<script setup lang="ts">
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  league = null, selection, range = [], loading = false
} = defineProps<{
  league?: League | null
  selection?: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
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
    <template v-if="!loading && league">
      <img
        v-if="league.image"
        :src="league.image"
        :alt="league.name"
        class="w-full h-32 object-cover"
      >
      <ImageOffPlaceholder v-else class="w-full h-32" icon-class="size-8" />
    </template>
    <USkeleton v-else class="w-full h-32 rounded-none" />

    <div
      v-if="!loading && league"
      class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0"
    >
      <span class="text-base font-bold leading-none">{{ dayPart(league.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(league.startDate) }}</span>
    </div>
    <USkeleton v-else class="absolute top-2 left-2 w-12 h-12 rounded-lg" :ui="{ base: 'bg-black' }" />

    <!-- Same attribution overlay as TournamentsListCover.vue — required
         alongside any art_crop use, see CardArtPicker.vue's own comment. -->
    <UTooltip
      v-if="!loading && league && league.image && league.imageCardName"
      :text="league.imageCardArtist
        ? t('magic.cardArtPicker.attribution', {
          cardName: league.imageCardName, artist: league.imageCardArtist
        })
        : t('magic.cardArtPicker.attributionNoArtist', { cardName: league.imageCardName })"
    >
      <span class="absolute bottom-2 right-2 max-w-[75%] truncate rounded bg-default/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-muted">
        {{ league.imageCardName }}
      </span>
    </UTooltip>
    <USkeleton v-else-if="loading" class="absolute bottom-2 right-2 w-24 h-4 rounded" :ui="{ base: 'bg-black' }" />

    <UCheckbox
      v-if="!loading && league && selection"
      :model-value="selection.isSelected(league.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(league.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection!.toggle(
        league.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />
  </div>
</template>
