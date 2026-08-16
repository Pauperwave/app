<!-- app\components\ui\ViewModeTabs.vue -->
<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const { items } = defineProps<{
  items: TabsItem[]
}>()

const modelValue = defineModel<string | number>()

// w-fit on top of the shared boxed style: this switch sits inline in a toolbar and
// should hug its two labels rather than stretch.
const ui = { ...BOXED_TABS_UI, list: `${BOXED_TABS_UI.list} w-fit` }
</script>

<template>
  <UTabs
    v-model="modelValue"
    :items="items"
    :content="false"
    color="neutral"
    size="md"
    :ui="ui"
  />
</template>
