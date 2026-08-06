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

const { t } = useI18n()

const { icon = 'i-lucide-circle-x', size = 'xs', ariaLabel = t('inputs.clearButton.ariaLabel') } = defineProps<Props>()

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
    :aria-label="ariaLabel"
    class="cursor-pointer"
    @click="handleClear"
  />
</template>
