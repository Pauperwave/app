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
        <!-- Built like the seed ticket (ShuffleSeedField.vue), so the code looks the same. -->
        <label
          class="inline-flex h-8 items-center gap-2 rounded-md bg-primary/10 px-2.5 ring ring-inset transition focus-within:ring-2"
          :class="isInvalid ? 'ring-error' : 'ring-primary/25 focus-within:ring-primary'"
        >
          <UIcon :name="ICONS.shuffle" class="size-4 shrink-0 text-primary" />
          <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {{ t('tournament.single.shuffleSeed.label') }}
          </span>
          <input
            v-model="text"
            :placeholder="t('tournament.single.shuffleSeed.placeholder')"
            :aria-label="t('tournament.single.shuffleSeed.use')"
            class="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-dimmed"
            autocomplete="off"
            spellcheck="false"
          >
          <UIcon :name="ICONS.paste" class="size-3.5 shrink-0 text-dimmed" />
        </label>
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
