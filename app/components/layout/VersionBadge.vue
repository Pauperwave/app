<!-- app\components\layout\VersionBadge.vue -->
<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  collapsed?: boolean
}

const { collapsed = false } = defineProps<Props>()

const { t } = useI18n()
const {
  public: { appVersion, gitCommitSha, gitCommitDate }
} = useRuntimeConfig()

// Same 7-char short hash convention as the Telegram bot's own /versione
// (server/utils/telegram/commands/core.ts) — empty only if git is unavailable.
const shortSha = computed(() => gitCommitSha ? gitCommitSha.slice(0, 7) : '')

const fullVersionText = computed(() => shortSha.value
  ? `v${appVersion} • ${shortSha.value}`
  : `v${appVersion}`)

// Collapsed tooltip: version, sha and (once known) how long ago it was updated
const collapsedTooltipText = computed(() => updatedLabel.value
  ? `${fullVersionText.value} • ${updatedLabel.value}`
  : fullVersionText.value)

// How long ago the deployed commit was made, as the one relevant unit
// (minutes < 1h, hours < 1d, days < 1 month, ...). Empty when the commit date
// is unknown. `now` starts null and is set on mount: the label depends on the
// current time, which differs between the server render and the client, so
// rendering it during SSR would cause a hydration mismatch. Ticks every
// minute, the finest unit shown.
const now = ref<Date | null>(null)
let tick: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = new Date()
  tick = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})
onUnmounted(() => clearInterval(tick))

const updatedLabel = computed(() => {
  if (!gitCommitDate || !now.value) return ''
  const since = timeSince(gitCommitDate, now.value)
  if (!since) return ''

  const { unit, count } = since
  if (unit === 'minutes') return t('versionBadge.updated.minutes', { count }, count)
  if (unit === 'hours') return t('versionBadge.updated.hours', { count }, count)
  if (unit === 'days') return t('versionBadge.updated.days', { count }, count)
  if (unit === 'months') return t('versionBadge.updated.months', { count }, count)
  if (unit === 'years') return t('versionBadge.updated.years', { count }, count)
  return t('versionBadge.updatedNow')
})

// Exact commit date for the tooltip (same format as the Telegram /versione)
const updatedAtText = computed(() => {
  if (!gitCommitDate) return ''
  return format(parseISO(gitCommitDate), 'd MMMM yyyy \'alle\' HH:mm', { locale: it })
})

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
    :text="collapsedTooltipText"
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
    <p class="text-dimmed text-xs text-center">
      <span class="font-mono">v{{ appVersion }}</span>
      <span v-if="shortSha" class="font-mono"> • {{ shortSha }}</span>
      <UTooltip v-if="updatedLabel" :text="updatedAtText">
        <span class="block cursor-default">{{ updatedLabel }}</span>
      </UTooltip>
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
