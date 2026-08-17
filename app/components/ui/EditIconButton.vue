<!-- app\components\ui\EditIconButton.vue -->
<!--
  The icon-only "edit" button used in every list table/card's row actions
  (tournaments' table + grid card, leagues' table + grid card, ...) — wraps a
  UTooltip around the button so the icon-only affordance still reads on
  hover, previously duplicated ad hoc per call site with no tooltip at all.
  Rendered via h() from table-column composables (see the render-functions
  note in the root CLAUDE.md) as well as used directly in .vue templates, so
  it stays a plain color=neutral/variant=ghost UButton underneath — no
  slots, just label/size/click passthrough.
-->
<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

interface Props {
  label: string
  size?: ButtonProps['size']
}

const {
  label,
  size = 'md'
} = defineProps<Props>()

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <UTooltip :text="label">
    <UButton
      :icon="ICONS.edit"
      color="neutral"
      variant="ghost"
      :size="size"
      :aria-label="label"
      @click="$emit('click', $event)"
    />
  </UTooltip>
</template>
