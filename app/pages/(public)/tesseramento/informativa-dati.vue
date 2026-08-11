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

// Static, self-authored file (app/content/informativa-dati.md) — v-html is
// safe here, there's no user input in the render path. Parsed once at setup
// time: pure sync parsing, no DOM dependency, so it works the same on SSR
// and client with no onMounted/watch needed.
const html = new MarkdownIt().render(rawContent)
</script>

<template>
  <UPageCard>
    <!-- @tailwindcss/typography's `prose` gives the markdown output real
         heading/list/blockquote styling for free — the markdown's own <h1>
         is the visual title here, so UPageCard has no separate :title. No
         max-w-none: `prose`'s own default max-width (65ch) is the plugin's
         deliberate "ideal reading measure" for body text, left in place
         rather than stretched to fill the card — some empty space on wide
         screens is the tradeoff. prose-code:before/after:content-none strips
         the plugin's default backtick markers around inline code
         (`pauperwave@gmail.com`) — nice for reading actual code, but reads
         like stray punctuation around a plain email/monospace value.
         prose-h1:text-2xl shrinks the default h1 size (~2.25em) so the long
         title wraps to 2 lines instead of 3 — purely visual, the markdown
         text itself is untouched. -->
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
