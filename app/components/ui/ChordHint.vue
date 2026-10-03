<!-- app\components\ui\ChordHint.vue -->
<!-- Muted UKbd chip(s) for a keyboard shortcut hint, one chip per key (['f', 't'] renders "f"
     "t" side by side): the same UX as default.vue's "g x" sidebar nav hint
     (docs/architecture/shortcuts.md), shown from the moment the chord's prefix key is pressed
     until the next keystroke.  Own gap-1 wrapper, independent of the caller's flex row gap, so
     the keys sit as tight as the sidebar's original hint wherever rendered. -->
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
