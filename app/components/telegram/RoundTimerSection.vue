<!-- app\components\telegram\RoundTimerSection.vue -->
<script setup lang="ts">
interface Props {
  label: string
  isActive: boolean
  adjustMinutes: number
}

const { label, isActive, adjustMinutes } = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
  reset: []
  adjust: [deltaMinutes: number]
}>()
</script>

<template>
  <section class="flex-2 min-h-0 flex flex-col w-full">
    <div class="flex-1 min-h-0 flex items-center justify-center">
      <p class="text-[10rem] leading-none font-bold tabular-nums">
        {{ label }}
      </p>
    </div>

    <div class="flex flex-col gap-2 w-full">
      <div class="flex gap-2 w-full">
        <UButton
          size="xl"
          block
          class="h-16 text-lg"
          :color="isActive ? 'warning' : 'primary'"
          @click="emit('toggle')"
        >
          {{ isActive ? 'Pausa' : 'Avvia' }}
        </UButton>

        <UButton
          size="xl"
          color="neutral"
          variant="subtle"
          class="h-16"
          :icon="ICONS.rotateBack"
          @click="emit('reset')"
        />
      </div>

      <div class="flex gap-2 w-full">
        <UButton
          size="xl"
          block
          color="error"
          variant="outline"
          class="h-16 text-lg"
          @click="emit('adjust', -adjustMinutes)"
        >
          -{{ adjustMinutes }} min
        </UButton>

        <UButton
          size="xl"
          block
          color="success"
          variant="outline"
          class="h-16 text-lg"
          @click="emit('adjust', adjustMinutes)"
        >
          +{{ adjustMinutes }} min
        </UButton>
      </div>
    </div>
  </section>
</template>
