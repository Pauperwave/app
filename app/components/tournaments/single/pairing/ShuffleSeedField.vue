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

// The code shown as a ticket ("SEC" + "123") until the organizer switches to typing one in.
const seedParts = computed(() => {
  if (seed === null) return null
  const parts = formatShuffleSeed(seed).split('-')
  return { letters: parts[0], digits: parts[1] }
})

// Typed code in the same monospace look as the ticket; the placeholder keeps the normal font.
const inputUi = {
  base: 'font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-sans'
}

const isEditing = ref(false)
const text = ref('')

const parsedSeed = computed(() => parseShuffleSeed(text.value))
const isInvalid = computed(() => text.value !== '' && parsedSeed.value === null)

watch(() => seed, () => {
  isEditing.value = false
})

function startEditing() {
  text.value = ''
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
}

function apply() {
  if (parsedSeed.value === null) return
  emit('apply', parsedSeed.value)
  isEditing.value = false
}

// Copies the seed of the current seating (not whatever is half-typed in the field).
function copySeed() {
  if (seed === null) return
  return copyToClipboard(formatShuffleSeed(seed), t('tournament.single.shuffleSeed.copiedTitle'))
}
</script>

<template>
  <div class="flex items-center gap-1.5">
    <template v-if="seedParts && !isEditing">
      <UTooltip :text="t('tournament.single.shuffleSeed.copyTooltip')">
        <button
          type="button"
          class="group inline-flex h-8 items-center gap-2 rounded-md bg-primary/10 px-2.5 ring ring-inset ring-primary/25 transition hover:bg-primary/15 hover:ring-primary/40"
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
      <UTooltip :text="t('tournament.single.shuffleSeed.editTooltip')">
        <UButton
          :icon="ICONS.edit"
          :aria-label="t('tournament.single.shuffleSeed.editTooltip')"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="startEditing"
        />
      </UTooltip>
    </template>

    <template v-else>
      <UTooltip :text="t('tournament.single.shuffleSeed.invalid')">
        <UInput
          v-model="text"
          :icon="ICONS.shuffle"
          :placeholder="t('tournament.single.shuffleSeed.placeholder')"
          :color="isInvalid ? 'error' : 'neutral'"
          :aria-label="t('tournament.single.shuffleSeed.placeholder')"
          :autofocus="isEditing"
          size="sm"
          class="w-40"
          :ui="inputUi"
          @keydown.enter.prevent="apply"
          @keydown.esc.stop="cancelEditing"
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
      <UButton
        v-if="seedParts"
        :icon="ICONS.close"
        :aria-label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="cancelEditing"
      />
    </template>
  </div>
</template>
