<!-- app\components\ui\AddButton.vue -->
<script setup lang="ts">
interface Props {
  label: string
  icon: string
  // Anchor for the page's guided tour. Every list page is meant to get a tour eventually (written
  // last, once the page has settled), so the id is a declared prop rather than attribute
  // fallthrough, keeping the intent readable at the call site
  id?: string
}

const { label, icon, id = undefined } = defineProps<Props>()
</script>

<template>
  <!-- No size/color/variant: every "new <thing>" button is the default primary md, and going
       through one component keeps it that way. @click falls through to the UButton, so call
       sites open their own modal -->
  <UButton
    :id="id"
    :label="label"
    :icon="icon"
  />
</template>
