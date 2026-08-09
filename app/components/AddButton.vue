<!-- app\components\AddButton.vue -->
<script setup lang="ts">
interface Props {
  label: string
  icon: string
  // Anchor for the page's guided tour. Every list page is meant to get a tour
  // eventually — it's written last, once the page has settled — so the id is a
  // declared prop rather than left to attribute fallthrough, to keep the intent
  // readable at the call site.
  id?: string
}

const { label, icon, id = undefined } = defineProps<Props>()
</script>

<template>
  <!-- No size/color/variant: every "new <thing>" button in the app is the default
       primary md, and going through one component is what keeps it that way.
       @click falls through to the UButton, so call sites still open their own
       modal. -->
  <UButton :id="id" :label="label" :icon="icon" />
</template>
