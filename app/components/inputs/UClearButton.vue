<script setup lang="ts">
interface Props {
  /** The model value to clear */
  modelValue?: string
  /** Icon to display (default: i-lucide-circle-x) */
  icon?: string
  /** Button size (default: xs) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Aria label for accessibility */
  ariaLabel?: string
}

const { icon = 'i-lucide-circle-x', size = 'xs', ariaLabel } = defineProps<Props>()
const { t } = useI18n()

const resolvedAriaLabel = computed(() => ariaLabel ?? t('inputs.clearButton.ariaLabel'))

const emit = defineEmits<{
  'update:modelValue': [value: '']
  'clear': []
}>()

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    :size="size"
    :icon="icon"
    :aria-label="resolvedAriaLabel"
    class="cursor-pointer"
    @click="handleClear"
  />
</template>
