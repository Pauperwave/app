<!-- app\components\calendar\DetailSlideover.vue -->
<!--
  Right-side detail panel for /calendario (user request 2026-08-14, same
  USlideover pattern as NotificationsSlideover.vue) — reads
  useCalendarDetail.ts, written by CalendarEventCard.vue /
  CalendarTournamentCard.vue when a card is tapped. Mounted once in
  PublicCalendarPage.vue.

  No native header/title bar (2026-08-14 redesign, same "full-bleed image +
  bottom gradient + overlaid title" hero as MagicTheGathering/league's
  CommanderArt.vue) — the image spans the top edge-to-edge, close button
  floats over it, and the title sits on the gradient instead of a separate
  bar above. :close="false" + no :title prop suppresses USlideover's default
  header entirely (see its own source: the header only renders when a
  title/description/close prop or slot is present).

  Participant rows use UUser + generatePlayerAvatar() directly, not
  PlayerTag.vue — that component always calls useAssociatesQuery()
  internally (even without an associateUuid prop), which queries
  pauperwave_associates_with_status with the anon Supabase client. On this
  public, unauthenticated page that's a real exposure risk given
  docs/BACKLOG.md's open P1 on that table's overly permissive RLS policy —
  participants here are plain name strings anyway, not linked to an
  associate record.
-->
<script lang="ts" setup>
import type { Tournament } from '~/types'

const selection = useCalendarDetail()

const isOpen = computed({
  get: () => selection.value !== null,
  set: (value: boolean) => {
    if (!value) selection.value = null
  }
})

// Mobile back-gesture support (user request 2026-08-14): without a pushed
// history entry, swiping back while the slideover is open navigates away
// from /calendario entirely instead of just dismissing it. Pushing a marker
// entry when it opens means the gesture's popstate closes the slideover
// first; `closingViaPopState` stops the resulting selection→isOpen watch
// from calling history.back() a second time for a back that already
// happened. Closing any other way (X button, clicking outside, selecting a
// nested tournament) still needs that history.back() to drop the marker
// entry, or the next real back-gesture would land on a stale one instead of
// leaving the page.
let closingViaPopState = false

watch(isOpen, (open, wasOpen) => {
  if (open && !wasOpen) {
    history.pushState({ calendarDetailOpen: true }, '')
  } else if (!open && wasOpen && !closingViaPopState) {
    history.back()
  }
  closingViaPopState = false
})

function onPopState() {
  if (!selection.value) return
  closingViaPopState = true
  selection.value = null
}

onMounted(() => window.addEventListener('popstate', onPopState))
onUnmounted(() => window.removeEventListener('popstate', onPopState))

// Switches the slideover to a tournament nested under the currently open
// event, instead of closing it.
function openTournament(tournament: Tournament) {
  selection.value = { kind: 'tournament', tournament }
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    inset
    :close="false"
    :ui="{ body: 'p-0 sm:p-0 flex-1 overflow-y-auto' }"
  >
    <template #body="{ close }">
      <CalendarEventDetailContent
        v-if="selection?.kind === 'event'"
        :event="selection.event"
        :tournaments="selection.tournaments"
        @open-tournament="openTournament"
      />

      <CalendarTournamentDetailContent
        v-else-if="selection?.kind === 'tournament'"
        :tournament="selection.tournament"
        :close="close"
      />
    </template>
  </USlideover>
</template>
