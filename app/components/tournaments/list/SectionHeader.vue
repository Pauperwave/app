<!-- app\components\tournaments\list\SectionHeader.vue -->
<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'

// Status badge plus tournament count heading a GridView.vue/DenseView.vue section
interface Props {
  label: string
  color: BadgeProps['color']
  icon: string
  count: number
}

const {
  label,
  color,
  icon,
  count
} = defineProps<Props>()
</script>

<template>
  <div class="flex items-center gap-1.5 mb-3">
    <UBadge
      :color="color"
      variant="subtle"
      :icon="icon"
    >
      {{ label }}
    </UBadge>
    <UBadge
      color="neutral"
      variant="subtle"
      size="sm"
    >
      {{ count }}
    </UBadge>
  </div>
</template>
