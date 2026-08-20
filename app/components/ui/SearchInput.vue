<!-- app\components\ui\SearchInput.vue -->
<!--
  Extracted 2026-08-20 (user request, "add a clear in trailing") the moment
  a second identical UInput+search-icon+clear-button block would have shown
  up — associates/index.vue, associates/requests.vue, players/index.vue, and
  all four /standings pages (internal + public) all use this same shape.
  `class` on the component tag forwards straight to the underlying UInput
  root (Vue's default single-root attrs fallthrough), so callers still
  control their own width.
-->
<script setup lang="ts">
defineProps<{ placeholder?: string }>()

const search = defineModel<string>({ required: true })
</script>

<template>
  <UInput
    v-model="search"
    :icon="ICONS.search"
    :placeholder="placeholder"
  >
    <template v-if="search" #trailing>
      <UButton
        :icon="ICONS.close"
        color="neutral"
        variant="link"
        size="xs"
        :padded="false"
        :aria-label="$t('common.clearSearch')"
        @click="search = ''"
      />
    </template>
  </UInput>
</template>
