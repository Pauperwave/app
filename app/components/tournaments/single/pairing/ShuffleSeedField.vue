<!-- app\components\tournaments\single\pairing\ShuffleSeedField.vue -->
<!-- Read-only ticket with the seed of the current random seating; click to copy it. -->
<script setup lang="ts">
import { formatShuffleSeed } from '#shared/utils/seededShuffle'

const { seed } = defineProps<{
  seed: number | null
}>()

const { t } = useI18n()
const { copyToClipboard } = useCopyToClipboard()

const seedParts = computed(() => {
  if (seed === null) return null
  const parts = formatShuffleSeed(seed).split('-')
  return { letters: parts[0], digits: parts[1] }
})

function copySeed() {
  if (seed === null) return
  return copyToClipboard(formatShuffleSeed(seed), t('tournament.single.shuffleSeed.copiedTitle'))
}
</script>

<template>
  <UTooltip v-if="seedParts" :text="t('tournament.single.shuffleSeed.copyTooltip')">
    <button
      type="button"
      class="group inline-flex h-8 cursor-pointer items-center gap-2 rounded-md bg-primary/10 px-2.5 ring ring-inset ring-primary/25 transition hover:bg-primary/15 hover:ring-primary/40"
      :aria-label="t('tournament.single.shuffleSeed.copyTooltip')"
      @click="copySeed"
    >
      <UIcon :name="ICONS.shuffle" class="size-4 text-primary" />
      <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {{ t('tournament.single.shuffleSeed.label') }}
      </span>
      <span class="font-mono text-sm font-bold tracking-[0.2em]">
        <span class="text-primary">{{ seedParts.letters }}</span>
        <span class="text-dimmed">-</span>
        <span class="text-highlighted">{{ seedParts.digits }}</span>
      </span>
      <UIcon :name="ICONS.copy" class="size-3.5 text-dimmed transition group-hover:text-default" />
    </button>
  </UTooltip>
</template>
