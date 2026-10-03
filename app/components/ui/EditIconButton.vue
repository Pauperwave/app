<!-- app\components\ui\EditIconButton.vue -->
<!-- The icon-only "edit" button of every list table/card's row actions (tournaments', leagues',
     ... table + grid card): a UTooltip around the button so the icon-only affordance still
     reads on hover (it was duplicated ad hoc per call site with no tooltip). Rendered via h()
     from table-column composables (see the render-functions note in the root CLAUDE.md) and
     used directly in templates, so it stays a plain color=neutral/variant=ghost UButton: no
     slots, just label/size/click passthrough. -->
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
