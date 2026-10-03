<!-- app\pages\(public)\tesseramento\informativa-dati.vue -->
<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import rawContent from '~/content/informativa-dati.md?raw'

definePageMeta({ layout: 'public' })

const { t } = useI18n()

useSeoMeta({
  title: t('tesseramento.informativaDati.title'),
  robots: 'noindex, nofollow'
})

// Static, self-authored file (app/content/informativa-dati.md): v-html is safe, there is no user
// input in the render path. Parsed once at setup: pure sync parsing with no DOM dependency, so it
// works the same on SSR and client with no onMounted/watch
// fallow-ignore-file security-sink -- see the comment above
const html = new MarkdownIt().render(rawContent)
</script>

<template>
  <!-- fallow-ignore-file security-sink -- see the top-of-file comment -->
  <UPageCard>
    <!-- @tailwindcss/typography's `prose` gives the markdown real heading/list/blockquote
         styling: the markdown's <h1> is the visual title, so UPageCard has no :title. No
         max-w-none: `prose`'s default max-width (65ch) is the plugin's "ideal reading measure"
         for body text, left in place at the tradeoff of some empty space on wide screens.
         prose-code:before/after:content-none strips the default backtick markers around inline
         code (`pauperwave@gmail.com`), which read like stray punctuation around a plain email
         value. prose-h1:text-2xl shrinks the default h1 (~2.25em) so the long title wraps to 2
         lines instead of 3: purely visual -->
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
