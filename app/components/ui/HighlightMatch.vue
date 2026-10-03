<!-- app\components\ui\HighlightMatch.vue -->
<!-- Wraps the first case-insensitive occurrence of `query` inside `text` in a <mark> (every
     table cell fed by a search box). Renders `text` plain when `query` is empty or not found,
     which also covers fuzzy-only matches (associatesGlobalFilterFn.ts's name fuzzy match): they
     have no clean substring position to highlight. -->
<script setup lang="ts">
const { text, query } = defineProps<{
  text: string
  query: string
}>()

const match = computed(() => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return null

  const index = text.toLowerCase().indexOf(trimmedQuery.toLowerCase())
  if (index === -1) return null

  return {
    before: text.slice(0, index),
    match: text.slice(index, index + trimmedQuery.length),
    after: text.slice(index + trimmedQuery.length)
  }
})
</script>

<template>
  <!-- Must stay on one line: any inserted whitespace between before/match/after
       would render as a literal extra space. -->
  <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
  <template v-if="match">{{ match.before }}<mark class="bg-primary/25 text-highlighted rounded-sm">{{ match.match }}</mark>{{ match.after }}</template>
  <template v-else>
    {{ text }}
  </template>
</template>
