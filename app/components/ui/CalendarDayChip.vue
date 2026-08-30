<!-- app\components\ui\CalendarDayChip.vue -->
<!--
  Shared #day slot content for DateRangePicker.vue/StartDatePickerField.vue's
  UCalendar (extracted 2026-08-29, fallow:dupes) — dots a day with a
  status-colored UChip + hover tooltip whenever useCalendarDayHighlights.ts's
  eventsFor() finds events for it. The hover listeners live on this wrapping
  `span.contents`, not on UChip itself: UChip declares `inheritAttrs: false`
  and forwards its own $attrs into the default slot's content (reka-ui's
  asChild `Slot`) — since that content here is bare text (`day.day`), not an
  element, a listener put directly on `<UChip>` silently attaches to nothing
  (see node_modules/@nuxt/ui/dist/runtime/components/Chip.vue). `display:
  contents` keeps this span out of the cell's own layout/sizing.
-->
<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { CalendarHighlightedDate } from '~/types'

const { day, events, hovered } = defineProps<{
  day: DateValue
  events: CalendarHighlightedDate[]
  hovered: boolean
}>()

const emit = defineEmits<{ hover: [isHovered: boolean] }>()
</script>

<template>
  <span
    class="contents"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
  >
    <UTooltip
      v-if="events.length"
      :text="events.map(event => event.label).join('\n')"
      :ui="{ text: 'whitespace-pre-line' }"
      :open="hovered"
    >
      <UChip
        :color="events.at(-1)!.color"
        size="xs"
        position="top-right"
      >
        {{ day.day }}
      </UChip>
    </UTooltip>
    <UChip
      v-else
      :show="false"
      size="xs"
      position="top-right"
    >
      {{ day.day }}
    </UChip>
  </span>
</template>
