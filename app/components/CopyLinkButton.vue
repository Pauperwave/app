<!-- app\components\CopyLinkButton.vue -->
<script setup lang="ts">
// Icon-only "copy link" button — generic (not associates-specific): give it
// any URL and it copies it, with a toast + a brief check-icon confirmation.
const { url, label } = defineProps<{
  url: string
  /** Tooltip text; defaults to the URL itself if not given. */
  label?: string
}>()

const { t } = useI18n()
const toast = useToast()
const { copy, copied } = useClipboard({ source: url })

async function handleClick() {
  await copy()
  toast.add({
    title: t('common.linkCopied'),
    color: 'success'
  })
}
</script>

<template>
  <UTooltip :text="label ?? url">
    <UButton
      :icon="copied ? ICONS.confirm : ICONS.link"
      :aria-label="t('common.copyLink')"
      color="neutral"
      variant="outline"
      square
      @click="handleClick"
    />
  </UTooltip>
</template>
