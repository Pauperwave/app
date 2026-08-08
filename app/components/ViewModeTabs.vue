<!-- app\components\ViewModeTabs.vue -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const { items } = defineProps<{
  items: TabsItem[]
}>()

const modelValue = defineModel<string | number>()
</script>

<template>
  <UTabs
    v-model="modelValue"
    :items="items"
    variant="pill"
    size="sm"
    :content="false"
    :ui="{ list: 'w-fit' }"
  />
</template>
