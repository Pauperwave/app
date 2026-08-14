<!-- app\components\events\ShareButton.vue -->
<!--
  Share action for /calendario's cards and detail slideover (user request
  2026-08-14). No per-item deep link exists yet (cards aren't individually
  routable, see PublicCalendarPage.vue's own comment on that) — shares the
  current /calendario page URL with the item's name/date as the share text,
  same scope limitation AddToCalendarButton.vue/eventIcs.ts already accept.
  Web Share API on mobile/supported browsers (native share sheet), clipboard
  copy fallback everywhere else.
-->
<script lang="ts" setup>
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  name: string
  startDate: string
  /** Icon-only (square, no text) — used in CalendarCard.vue's header corner,
   * where the label would collide with the title. */
  showLabel?: boolean
}

const { name, startDate, showLabel = true } = defineProps<Props>()

const { t } = useI18n()
const toast = useToast()

async function share() {
  const shareData = {
    title: name,
    text: `${name} — ${format(new Date(startDate), 'PPP', { locale: it })}`,
    url: window.location.href
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch {
      // AbortError when the user dismisses the native share sheet — not an
      // error worth surfacing.
    }
    return
  }

  try {
    await navigator.clipboard.writeText(shareData.url)
    toast.add({ title: t('event.calendar.shareLinkCopiedTitle'), color: 'success' })
  } catch (err) {
    toast.add({
      title: t('event.calendar.shareErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UButton
    :label="showLabel ? $t('event.calendar.share') : undefined"
    :icon="ICONS.share"
    :square="!showLabel"
    :aria-label="showLabel ? undefined : $t('event.calendar.share')"
    color="neutral"
    variant="subtle"
    size="sm"
    @click="share"
  />
</template>
