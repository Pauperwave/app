<!-- app\components\calendar\DetailSlideover.vue -->
<!-- Right-side detail panel for /calendario (the USlideover pattern of NotificationsSlideover.vue):
     reads useCalendarDetail.ts, written by CalendarEventCard.vue / CalendarTournamentCard.vue when
     a card is tapped. Mounted once in PublicCalendarPage.vue.  No :title/:description prop: the
     #header slot holds the "full-bleed image + bottom gradient + overlaid title" hero (like
     league's CommanderArt.vue), pinned while #body scrolls underneath. :close="false" + a custom
     close button on the hero (tournament branch) replaces USlideover's own; `content: 'divide-y-0'`
     strips the header/body divider so the image sits edge-to-edge. `header: 'p-0 sm:px-0 min-h-0'`
     strips the header padding: both p-0 AND sm:px-0 are needed, since SlideoverHeader's default
     sm:px-6 isn't cancelled by p-0 alone (different variant signature, so tailwind-merge doesn't
     collapse them), leaving visible gaps on both sides of the hero at sm:+ ("black bands").
     Participant rows use UUser + generatePlayerAvatar() directly, not AssociateTag.vue: that always
     calls useAssociatesQuery() (even without an associateUuid prop), querying
     pauperwave_associates_with_status with the anon Supabase client, a real exposure risk on this
     unauthenticated page given docs/BACKLOG.md's open P1 on that table's permissive RLS policy.
     Participants here are plain name strings, not linked to an associate record. -->
<script lang="ts" setup>
import type { Tournament } from '~/types'

const selection = useCalendarDetail()

const isOpen = computed({
  get: () => selection.value !== null,
  set: (value: boolean) => {
    if (!value) selection.value = null
  }
})

// Mobile back-gesture support: without a pushed history entry, swiping back while the slideover is
// open leaves /calendario instead of dismissing it. Pushing a marker entry on open makes the
// gesture's popstate close the slideover first; `closingViaPopState` stops the resulting
// selection→isOpen watch from calling history.back() again for a back that already happened.
// Closing any other way (X, clicking outside, selecting a nested tournament) still needs
// history.back() to drop the marker entry, or the next real back-gesture would land on a stale one
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
    :ui="{
      header: 'p-0 sm:px-0 min-h-0',
      body: 'p-0 sm:p-0 flex-1 overflow-y-auto',
      content: 'divide-y-0 overflow-hidden'
    }"
  >
    <!-- Hero (image/gradient/title) pinned in the native #header slot: it stays visible while the
         details scroll underneath in #body -->
    <template #header="{ close }">
      <CalendarEventDetailHero
        v-if="selection?.kind === 'event'"
        :event="selection.event"
      />

      <CalendarTournamentDetailHero
        v-else-if="selection?.kind === 'tournament'"
        :tournament="selection.tournament"
        :close="close"
      />
    </template>

    <template #body>
      <CalendarEventDetailContent
        v-if="selection?.kind === 'event'"
        :event="selection.event"
        :tournaments="selection.tournaments"
        @open-tournament="openTournament"
      />

      <CalendarTournamentDetailContent
        v-else-if="selection?.kind === 'tournament'"
        :tournament="selection.tournament"
      />
    </template>
  </USlideover>
</template>
