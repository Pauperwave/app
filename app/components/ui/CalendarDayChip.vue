<!-- app\components\ui\CalendarDayChip.vue -->
<!-- Shared #day slot content for DateRangePicker.vue/StartDatePickerField.vue's UCalendar: dots
     a day with a status-colored UChip + hover tooltip when useCalendarDayHighlights.ts's
     eventsFor() finds events for it. The hover listeners live on this wrapping `span.contents`,
     not UChip: UChip declares `inheritAttrs: false` and forwards its $attrs into the default
     slot's content (reka-ui's asChild `Slot`), and since that content is bare text (`day.day`),
     not an element, a listener on `<UChip>` attaches to nothing (see
     node_modules/@nuxt/ui/dist/runtime/components/Chip.vue). `display: contents` keeps the span
     out of the cell's layout/sizing. -->
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
