<!-- app\components\layout\VersionBadge.vue -->
<script setup lang="ts">
interface Props {
  collapsed?: boolean
}

const { collapsed = false } = defineProps<Props>()

const { t } = useI18n()
const {
  public: { appVersion, gitCommitSha }
} = useRuntimeConfig()

// Same 7-char short hash convention as the Telegram bot's own /versione
// (server/utils/telegram/commands/core.ts) — empty locally/outside Vercel,
// since gitCommitSha itself is only set by Vercel's own build-time env var.
const shortSha = computed(() => gitCommitSha ? gitCommitSha.slice(0, 7) : '')

const fullVersionText = computed(() => shortSha.value
  ? `v${appVersion} • ${shortSha.value}`
  : `v${appVersion}`)

// Expanded-only (user request, 2026-09-18) — same clipboard-with-toast
// helper as useAssociatesRowActions.ts/usePlayersRowActions.ts, not
// CopyLinkButton.vue's own useClipboard (that one's icon-swap-on-copied
// feedback needs its own visible button at all times; this button only
// shows on hover, so the toast alone is enough confirmation).
const { copyToClipboard } = useCopyToClipboard()
function copyVersionInfo() {
  copyToClipboard(fullVersionText.value, t('versionBadge.copied'))
}
</script>

<template>
  <!-- Collapsed hides the " • sha" suffix (no room) — a tooltip surfaces it
       instead of just dropping it silently, same convention as every other
       collapsed-sidebar control (nav items via UNavigationMenu's own
       `tooltip`, UDashboardSearchButton, user request 2026-08-19). No copy
       button here either — same "no room" reasoning, and there's nowhere
       to hover-reveal it without the tooltip's own hover already owning
       that interaction. -->
  <UTooltip
    v-if="appVersion && collapsed"
    :text="fullVersionText"
    :content="{ side: 'right' }"
  >
    <p class="text-dimmed text-xs text-center">
      <span class="font-mono">v{{ appVersion }}</span>
    </p>
  </UTooltip>

  <!-- Expanded: a "badge" only in the sense that hovering reveals a ring +
       a copy button (user request, 2026-09-18) — visually identical to the
       old plain text at rest, so it doesn't look like a new heavier UI
       element when idle. -->
  <div
    v-else-if="appVersion"
    class="group flex items-center justify-center gap-1 rounded-md px-1.5 py-0.5
      ring-1 ring-transparent hover:ring-default transition-colors"
  >
    <p class="text-dimmed text-xs">
      <span class="font-mono">v{{ appVersion }}</span>
      <span v-if="shortSha" class="font-mono"> • {{ shortSha }}</span>
    </p>
    <UTooltip :text="t('versionBadge.copy')">
      <UButton
        :icon="ICONS.copy"
        :aria-label="t('versionBadge.copy')"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        @click="copyVersionInfo"
      />
    </UTooltip>
  </div>
</template>
