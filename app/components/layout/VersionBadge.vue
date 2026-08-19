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
  <!-- Collapsed hides the " • env" suffix (no room) — a tooltip surfaces it
       instead of just dropping it silently, same convention as every other
       collapsed-sidebar control (nav items via UNavigationMenu's own
       `tooltip`, UDashboardSearchButton, user request 2026-08-19). -->
  <UTooltip
    v-if="appVersion && collapsed"
    :text="`v${appVersion} • ${appEnv}`"
    :content="{ side: 'right' }"
  >
    <p class="text-dimmed text-xs text-center">
      <span class="font-mono">v{{ appVersion }}</span>
    </p>
  </UTooltip>
  <p v-else-if="appVersion" class="text-dimmed text-xs">
    <span class="font-mono">v{{ appVersion }}</span>
    <span> • {{ appEnv }}</span>
  </p>
</template>
