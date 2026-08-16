<!-- app\components\leagues\list\Cover.vue -->
<!--
  Leagues' own version of TournamentsListCover.vue (2026-08-16, "make the
  leagues cards match the tournaments cards") — same image/date-chip/
  checkbox layout, adapted to League's fields: no per-league image (leagues
  have no `image` column), so it always falls back to the shared default
  cover; "active" gets the pulsing dot tournaments give "in_progress" (the
  closest equivalent — a league genuinely underway vs. still a draft/wrapped
  up/cancelled).
-->
<script setup lang="ts">
import type { League } from '~/types'
import type { Selection } from '~/composables/useSelection'

const { league, selection, range } = defineProps<{
  league: League
  selection: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range: number[]
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
    <img
      :src="DEFAULT_CALENDAR_COVER_IMAGE"
      :alt="league.name"
      class="w-full h-32 object-cover"
    >

    <div class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0">
      <span class="text-base font-bold leading-none">{{ dayPart(league.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(league.startDate) }}</span>
    </div>

    <span
      v-if="league.status === 'active'"
      class="absolute top-3 right-11 size-2.5 rounded-full bg-warning shrink-0 animate-pulse motion-reduce:animate-none"
      :title="t('league.status.active')"
    />

    <UCheckbox
      :model-value="selection.isSelected(league.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(league.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection.toggle(
        league.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />
  </div>
</template>
