<!-- app\components\layout\DeveloperViewToggle.vue -->
<!--
  Toggles the app-wide "developer view" (margin-visualization overlay,
  see useDeveloperView.ts/main.css's .debug-spacing) — ported from
  MagicTheGathering/league's DeveloperViewToggle.vue (user request,
  2026-09-18: "copia da league il tasto developer"), gated behind the same
  hardcoded password as a speed bump, not a real auth boundary (the app
  already sits behind Supabase auth) — just enough that an organizer's
  screen isn't one accidental click away from a distracting debug overlay.

  One button, one popover, content depends on state (user request,
  2026-09-18: pressing it again while already unlocked should reopen the
  popover with its settings, not immediately disable developer view) —
  password prompt while locked, overlay switch + disable button once
  unlocked. league instead spreads this across three components
  (DeveloperViewToggle/DeveloperOverlayToggle/DeveloperToolbarButton) since
  its overlay toggle is its own always-visible header button; collapsed
  into one popover here since there's nowhere to put a second standalone
  button without reopening the "no room" problem this was moved to fix.
-->
<script setup lang="ts">
// Hardcoded on purpose — see the file-level comment. Same value as league's
// own DEVELOPER_VIEW_PASSWORD for fidelity (user request: copy as-is).
const DEVELOPER_VIEW_PASSWORD = 'test'

const { isDeveloperView, isOverlayEnabled } = useDeveloperView()
const { t } = useI18n()

const showPopover = ref(false)
const password = ref('')
const passwordError = ref(false)

function openPopover() {
  if (!isDeveloperView.value) {
    password.value = ''
    passwordError.value = false
  }
  showPopover.value = true
}

function confirmPassword() {
  if (password.value !== DEVELOPER_VIEW_PASSWORD) {
    passwordError.value = true
    return
  }
  // Stays open on unlock (user request, 2026-09-18) — the popover's own
  // #content branch swaps from the password prompt to the settings panel
  // (overlay switch + disable button) in place, so the organizer can flip
  // "Mostra margini" right away without reopening the popover.
  isDeveloperView.value = true
}

function disable() {
  isDeveloperView.value = false
  showPopover.value = false
}

const tooltipText = computed(() => isDeveloperView.value
  ? t('common.developerViewSettings')
  : t('common.enableDeveloperView'))
</script>

<template>
  <ClientOnly>
    <UPopover v-model:open="showPopover">
      <UTooltip :content="{ side: 'right' }" :text="tooltipText">
        <UButton
          :icon="ICONS.terminal"
          :color="isDeveloperView ? 'warning' : 'neutral'"
          :variant="isDeveloperView ? 'soft' : 'ghost'"
          :class="!isDeveloperView && 'text-muted'"
          :aria-label="tooltipText"
          @click="openPopover"
        />
      </UTooltip>

      <template #content>
        <div v-if="!isDeveloperView" class="p-3 flex flex-col gap-2 w-56">
          <p class="text-sm font-medium">
            {{ t('common.developerViewPasswordDescription') }}
          </p>
          <UInput
            v-model="password"
            type="password"
            :placeholder="t('common.developerViewPasswordPlaceholder')"
            autofocus
            @keyup.enter="confirmPassword"
          />
          <p v-if="passwordError" class="text-error text-xs">
            {{ t('common.developerViewPasswordError') }}
          </p>
          <UButton block @click="confirmPassword">
            {{ t('common.developerViewPasswordConfirm') }}
          </UButton>
        </div>

        <div v-else class="p-3 flex flex-col gap-3 w-56">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm">{{ t('common.developerViewOverlayLabel') }}</span>
            <USwitch v-model="isOverlayEnabled" class="cursor-pointer" />
          </div>
          <UButton
            block
            color="error"
            variant="soft"
            @click="disable"
          >
            {{ t('common.disableDeveloperView') }}
          </UButton>
        </div>
      </template>
    </UPopover>

    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
