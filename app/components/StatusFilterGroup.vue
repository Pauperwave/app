<!-- app\components\StatusFilterGroup.vue -->
<script setup lang="ts" generic="T extends string">
interface StatusFilterItem<T extends string> {
  label: string
  value: T
  count?: number
}

const { items } = defineProps<{ items: StatusFilterItem<T>[] }>()
const modelValue = defineModel<T>()
</script>

<template>
  <UFieldGroup>
    <UButton
      v-for="option in items"
      :key="option.value"
      :label="option.label"
      color="neutral"
      :variant="modelValue === option.value ? 'solid' : 'outline'"
      @click="modelValue = option.value"
    >
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
