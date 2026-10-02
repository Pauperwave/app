<!-- app\components\tournaments\single\pairing\ApplySeedPopover.vue -->
<!-- "Usa un seed": paste a copied seed to rebuild the same random tables. -->
<script setup lang="ts">
import { parseShuffleSeed } from '#shared/utils/seededShuffle'

const { disabled = false } = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  apply: [seed: number]
}>()

const { t } = useI18n()

const open = ref(false)
const text = ref('')

const parsedSeed = computed(() => parseShuffleSeed(text.value))
const isInvalid = computed(() => text.value !== '' && parsedSeed.value === null)

// Same look as the seed ticket (ShuffleSeedField.vue); the placeholder keeps the normal font.
const inputUi = computed(() => ({
  base: [
    'h-8 rounded-md bg-primary/10 ring ring-inset font-mono text-sm font-bold uppercase',
    'tracking-[0.2em] text-primary focus-visible:ring-2',
    'placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal',
    isInvalid.value ? 'ring-error focus-visible:ring-error' : 'ring-primary/25 focus-visible:ring-primary'
  ].join(' '),
  leadingIcon: 'text-primary'
}))

watch(open, (isOpen) => {
  if (isOpen) text.value = ''
})

function apply() {
  if (parsedSeed.value === null) return
  emit('apply', parsedSeed.value)
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open" :content="{ side: 'bottom', align: 'end' }">
    <UTooltip :text="t('tournament.single.shuffleSeed.useTooltip')">
      <UButton
        :icon="ICONS.paste"
        :aria-label="t('tournament.single.shuffleSeed.use')"
        :disabled="disabled"
        color="neutral"
        variant="outline"
        size="sm"
      />
    </UTooltip>

    <template #content>
      <form class="flex w-64 flex-col gap-2 p-3" @submit.prevent="apply">
        <span class="text-xs font-medium text-muted">
          {{ t('tournament.single.shuffleSeed.use') }}
        </span>
        <UInput
          v-model="text"
          :icon="ICONS.shuffle"
          :placeholder="t('tournament.single.shuffleSeed.placeholder')"
          :aria-label="t('tournament.single.shuffleSeed.use')"
          :ui="inputUi"
          variant="none"
          autofocus
        />
        <p v-if="isInvalid" class="text-xs text-error">
          {{ t('tournament.single.shuffleSeed.invalid') }}
        </p>
        <UButton
          type="submit"
          :label="t('tournament.single.shuffleSeed.apply')"
          :disabled="parsedSeed === null"
          size="sm"
          block
        />
      </form>
    </template>
  </UPopover>
</template>
