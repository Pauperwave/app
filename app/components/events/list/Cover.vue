<!-- app\components\events\list\Cover.vue -->
<!--
  Events' own version of TournamentsListCover.vue (2026-08-22, issue #45 +
  "make presentable /events") — same image/date-chip/checkbox layout. No
  attribution chip (unlike tournaments/leagues): the `events` table has no
  image_card_name/image_card_artist columns, so there's nothing to
  attribute even when `image` is set.
-->
<script setup lang="ts">
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  // fallow-ignore-next-line code-duplication -- mirrors leagues/tournaments' own Cover.vue
  event = null, selection, range = [], loading = false
} = defineProps<{
  event?: Event | null
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
    <template v-if="!loading && event">
      <img
        v-if="event.image"
        :src="event.image"
        :alt="event.name"
        class="w-full h-32 object-cover"
      >
      <ImageOffPlaceholder v-else class="w-full h-32" icon-class="size-8" />
    </template>
    <USkeleton v-else class="w-full h-32 rounded-none" />

    <div
      v-if="!loading && event"
      class="absolute top-2 left-2 flex flex-col items-center justify-center rounded-lg bg-default/90 backdrop-blur-sm border border-default w-12 h-12 shrink-0"
    >
      <span class="text-base font-bold leading-none">{{ dayPart(event.startDate) }}</span>
      <span class="text-[10px] uppercase text-muted">{{ monthPart(event.startDate) }}</span>
    </div>
    <USkeleton v-else class="absolute top-2 left-2 w-12 h-12 rounded-lg" :ui="{ base: 'bg-black' }" />

    <UCheckbox
      v-if="!loading && event && selection"
      :model-value="selection.isSelected(event.id)"
      size="xl"
      class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100!': selection.isSelected(event.id) }"
      :ui="{ base: 'bg-default/90 rounded' }"
      :aria-label="t('common.selectRow')"
      @update:model-value="() => selection!.toggle(
        event.id, { shiftKey: lastClickShiftKey, range }
      )"
      @click.stop="lastClickShiftKey = $event.shiftKey"
    />
  </div>
</template>
