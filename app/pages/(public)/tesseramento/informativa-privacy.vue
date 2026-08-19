<!-- app\pages\(public)\tesseramento\informativa-privacy.vue -->
<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import rawContent from '~/content/informativa-privacy.md?raw'

definePageMeta({ layout: 'public' })

const { t } = useI18n()

useSeoMeta({
  title: t('tesseramento.informativaPrivacy.title'),
  robots: 'noindex, nofollow'
})

// Static, self-authored file (app/content/informativa-privacy.md) — v-html is
// safe here, there's no user input in the render path. Same pattern as
// informativa-dati.vue.
// fallow-ignore-file security-sink -- see the comment above
const html = new MarkdownIt().render(rawContent)
</script>

<template>
  <!-- fallow-ignore-file security-sink -- see the top-of-file comment -->
  <UPageCard>
    <!-- eslint-disable-next-line vue/no-v-html -- static, self-authored markdown, no user input -->
    <div class="prose dark:prose-invert prose-h1:text-2xl prose-code:before:content-none prose-code:after:content-none" v-html="html" />

    <UButton
      :label="$t('tesseramento.backToForm')"
      :icon="ICONS.chevronLeft"
      color="neutral"
      variant="subtle"
      class="mt-6"
      to="/tesseramento"
    />
  </UPageCard>
</template>
