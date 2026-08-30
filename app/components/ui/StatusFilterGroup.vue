<!-- app\components\ui\StatusFilterGroup.vue -->
<script setup lang="ts" generic="T extends string">
interface StatusFilterItem<T extends string> {
  label: string
  value: T
  count?: number
  // Optional per-item icon — when set, the label collapses to icon-only
  // below `lg` (user request, 2026-08-24: transactions' type tabs running
  // out of room before the toolbar itself wraps). Items with no icon always
  // show their label — collapsing to a bare, unlabeled button would leave
  // no affordance at all.
  icon?: string
  disabled?: boolean
}

const { items } = defineProps<{ items: StatusFilterItem<T>[] }>()
const modelValue = defineModel<T>()
</script>

<template>
  <UFieldGroup>
    <UButton
      v-for="option in items"
      :key="option.value"
      :icon="option.icon"
      :disabled="option.disabled"
      color="neutral"
      :variant="modelValue === option.value ? 'solid' : 'outline'"
      :aria-label="option.icon ? option.label : undefined"
      @click="modelValue = option.value"
    >
      <span :class="option.icon ? 'hidden lg:inline' : undefined">{{ option.label }}</span>

      <template v-if="option.count !== undefined" #trailing>
        <UBadge
          :label="option.count"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </template>
    </UButton>
  </UFieldGroup>
</template>
