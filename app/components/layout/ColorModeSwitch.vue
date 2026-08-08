<!-- app\components\layout\ColorModeSwitch.vue -->
<!--
  ColorModeSwitch.vue

  Toggles between light and dark theme.
  Uses the useThemeTransition composable to handle the animated theme change.
-->
<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const { isDark, toggleTheme } = useThemeTransition()
const { t } = useI18n()
</script>

<template>
  <!-- ClientOnly to avoid server-side rendering of this UI component -->
  <ClientOnly>
    <UButton
      :icon="isDark ? ICONS.lightMode : ICONS.darkMode"
      color="neutral"
      variant="ghost"
      :aria-label="isDark ? t('common.switchToLightMode') : t('common.switchToDarkMode')"
      @click="toggleTheme"
    />
    <!-- Placeholder while loading server-side -->
    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
