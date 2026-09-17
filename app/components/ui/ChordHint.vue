<!-- app\components\ui\ChordHint.vue -->
<!--
  Muted UKbd chip(s) for a keyboard shortcut hint — one chip per key, e.g.
  ['f', 't'] renders "f" "t" side by side. Same UX as default.vue's own "g x"
  sidebar nav hint (docs/architecture/shortcuts.md): shown from the moment
  the chord's prefix key is pressed until the next keystroke.

  Own gap-1 wrapper, independent of whatever gap the caller's own flex row
  uses for its other children — so the keys always sit as tight together as
  the sidebar's original hint, regardless of where they're rendered.
-->
<script setup lang="ts">
const { keys, show = true } = defineProps<{
  keys: string[]
  show?: boolean
}>()
</script>

<template>
  <div v-if="show" class="flex items-center gap-1">
    <UKbd
      v-for="key in keys"
      :key="key"
      size="sm"
      class="text-muted"
    >
      {{ key }}
    </UKbd>
  </div>
</template>
