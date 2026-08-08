<!-- app\components\inputs\UTimePicker.vue -->
<script setup lang="ts">
interface Props {
  modelValue?: string
  placeholder?: string
  icon?: string
  minuteStep?: number
}

const {
  modelValue, placeholder, icon, minuteStep = 15
} = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Generate hours (00-23)
const hours = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
)

// Generate minutes based on step
const minutes = computed(() => {
  const count = 60 / minuteStep
  return Array.from({ length: count }, (_, i) =>
    String(i * minuteStep).padStart(2, '0')
  )
})

// Parse initial time
const [initialHour, initialMinute] = (modelValue || '00:00').split(':')
const selectedHour = ref(initialHour)
const selectedMinute = ref(initialMinute)

// Watch for changes and emit
watch([selectedHour, selectedMinute], ([hour, minute]) => {
  emit('update:modelValue', `${hour}:${minute}`)
})

// Watch for external changes
watch(() => modelValue, (newValue) => {
  if (newValue) {
    const [hour, minute] = newValue.split(':')
    selectedHour.value = hour
    selectedMinute.value = minute
  }
})

const displayValue = computed(() => modelValue || '')
</script>

<template>
  <UPopover>
    <UInput
      :model-value="displayValue"
      readonly
      :icon="icon || 'i-lucide-clock'"
      :placeholder="placeholder || t('inputs.timePicker.placeholder')"
    />

    <template #content>
      <div class="p-2 space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-sm font-medium mb-2 block">{{ t('inputs.timePicker.hoursLabel') }}</label>
            <USelect
              v-model="selectedHour"
              class="w-20"
              :items="hours"
              placeholder="HH"
            />
          </div>
          <div>
            <label class="text-sm font-medium mb-2 block">{{ t('inputs.timePicker.minutesLabel') }}</label>
            <USelect
              v-model="selectedMinute"
              :items="minutes"
              placeholder="MM"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
