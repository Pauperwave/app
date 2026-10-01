<!-- app\components\tournaments\single\pairing\ShuffleSeedField.vue -->
<!-- Shows the seed of the current random seating and lets you type one to reproduce it. -->
<script setup lang="ts">
import { formatShuffleSeed, parseShuffleSeed } from '#shared/utils/seededShuffle'

const { seed } = defineProps<{
  seed: number | null
}>()

const emit = defineEmits<{
  apply: [seed: number]
}>()

const { t } = useI18n()
const { copyToClipboard } = useCopyToClipboard()

const text = ref(seed === null ? '' : formatShuffleSeed(seed))
watch(() => seed, (value) => {
  text.value = value === null ? '' : formatShuffleSeed(value)
})

const parsedSeed = computed(() => parseShuffleSeed(text.value))
const isInvalid = computed(() => text.value !== '' && parsedSeed.value === null)

function apply() {
  if (parsedSeed.value !== null) emit('apply', parsedSeed.value)
}

// Copies the seed of the current seating (not whatever is half-typed in the field).
function copySeed() {
  if (seed === null) return
  return copyToClipboard(formatShuffleSeed(seed), t('tournament.single.shuffleSeed.copiedTitle'))
}
</script>

<template>
  <div class="flex items-center gap-1.5">
    <UTooltip :text="t('tournament.single.shuffleSeed.invalid')">
      <UInput
        v-model="text"
        :icon="ICONS.shuffle"
        :placeholder="t('tournament.single.shuffleSeed.placeholder')"
        :color="isInvalid ? 'error' : 'neutral'"
        :aria-label="t('tournament.single.shuffleSeed.placeholder')"
        size="sm"
        class="w-40"
        @keydown.enter.prevent="apply"
      />
    </UTooltip>
    <UTooltip v-if="seed !== null" :text="t('tournament.single.shuffleSeed.copyTooltip')">
      <UButton
        :icon="ICONS.copy"
        :aria-label="t('tournament.single.shuffleSeed.copyTooltip')"
        color="neutral"
        variant="outline"
        size="sm"
        @click="copySeed"
      />
    </UTooltip>
    <UTooltip :text="t('tournament.single.shuffleSeed.applyTooltip')">
      <UButton
        :label="t('tournament.single.shuffleSeed.apply')"
        :disabled="parsedSeed === null"
        color="neutral"
        variant="outline"
        size="sm"
        @click="apply"
      />
    </UTooltip>
  </div>
</template>
