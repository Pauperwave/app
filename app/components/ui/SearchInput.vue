<!-- app\components\ui\SearchInput.vue -->
<!-- The UInput + search-icon + clear-button block shared by associates/index.vue,
     associates/requests.vue, players/index.vue and all four /standings pages (internal +
     public). `class` on the component tag forwards to the underlying UInput root (Vue's
     single-root attrs fallthrough), so callers control their own width. -->
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
