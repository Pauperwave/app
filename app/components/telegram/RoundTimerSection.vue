<!-- app\components\telegram\RoundTimerSection.vue -->
<script setup lang="ts">
interface Props {
  label: string
  isActive?: boolean
  adjustMinutes?: number
  // Following the event's timer: the countdown alone, no controls
  readonly?: boolean
  caption?: string
}

const {
  label,
  isActive = false,
  adjustMinutes = 5,
  readonly = false,
  caption = ''
} = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
  reset: []
  adjust: [deltaMinutes: number]
}>()

// Remembered on the phone. Turns the digits 90 degrees so they can use the screen's height:
// a phone lying on the table is read from a distance. Only applied in portrait (the toggle is
// hidden in landscape, where the digits already have room), so turning the phone sideways
// brings them upright and the choice returns when it is portrait again.
const isRotated = useLocalStorage('telegram-timer-rotated', false)
</script>

<template>
  <section class="flex-2 min-h-0 flex flex-col w-full">
    <div class="relative flex-1 min-h-0 flex items-center justify-center [container-type:size]">
      <p
        class="text-[length:min(28vw,10rem)] leading-none font-bold tabular-nums"
        :class="isRotated && 'portrait:[writing-mode:vertical-rl] portrait:text-[length:min(34cqh,90cqw)]'"
      >
        {{ label }}
      </p>

      <UButton
        :icon="ICONS.rotateClockwise"
        color="neutral"
        variant="ghost"
        class="absolute top-0 right-0 landscape:hidden"
        :aria-label="isRotated ? 'Raddrizza il timer' : 'Ruota il timer'"
        @click="isRotated = !isRotated"
      />
    </div>

    <p
      v-if="caption"
      class="text-sm text-muted pb-2"
    >
      {{ caption }}
    </p>

    <div
      v-if="!readonly"
      class="flex flex-col gap-2 w-full"
    >
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
