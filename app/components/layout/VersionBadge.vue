<!-- app\components\layout\VersionBadge.vue -->
<script setup lang="ts">
interface Props {
  collapsed?: boolean
}

const { collapsed = false } = defineProps<Props>()

const {
  public: { appVersion, appEnv }
} = useRuntimeConfig()
</script>

<template>
  <p
    v-if="appVersion"
    class="text-dimmed text-xs"
    :class="collapsed ? 'text-center' : ''"
  >
    <span class="font-mono">v{{ appVersion }}</span>
    <span v-if="!collapsed"> · {{ appEnv }}</span>
  </p>
</template>
