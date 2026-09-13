<!-- app\components\telegram\RoundTimerSection.vue -->
<script setup lang="ts">
interface Props {
  roundMinutes: number
  label: string
  isActive: boolean
  adjustMinutes: number
}

const {
  roundMinutes, label, isActive, adjustMinutes
} = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
  reset: []
  adjust: [deltaMinutes: number]
}>()
</script>

<template>
  <section class="flex-2 min-h-0 flex flex-col w-full">
    <p class="text-muted text-sm">
      Timer del round ({{ roundMinutes }} minuti)
    </p>

    <div class="flex-1 min-h-0 flex items-center justify-center">
      <p class="text-8xl font-bold tabular-nums">
        {{ label }}
      </p>
    </div>

    <div class="flex flex-col gap-2 w-full">
      <div class="flex gap-2 w-full">
        <UButton
          size="lg"
          block
          :color="isActive ? 'warning' : 'primary'"
          @click="emit('toggle')"
        >
          {{ isActive ? 'Pausa' : 'Avvia' }}
        </UButton>

        <UButton
          size="lg"
          color="neutral"
          variant="subtle"
          :icon="ICONS.rotateBack"
          @click="emit('reset')"
        />
      </div>

      <div class="flex gap-2 w-full">
        <UButton
          block
          color="error"
          variant="outline"
          @click="emit('adjust', -adjustMinutes)"
        >
          -{{ adjustMinutes }} min
        </UButton>

        <UButton
          block
          color="success"
          variant="outline"
          @click="emit('adjust', adjustMinutes)"
        >
          +{{ adjustMinutes }} min
        </UButton>
      </div>
    </div>
  </section>
</template>
