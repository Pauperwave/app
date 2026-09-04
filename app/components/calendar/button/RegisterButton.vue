<!-- app\components\calendar\button\RegisterButton.vue -->
<!--
  "Iscriviti"/"Disiscriviti" for /calendario's and /calendar's cards and
  detail views. Shared between an anonymous audience (/calendario) and a
  logged-in one (/calendar dashboard) — same component tree either way
  (PublicCalendarPage.vue). Without a `tournament` prop (Event cards,
  EventDetailContent.vue — no real event-level registration exists) this
  stays the original placeholder toast. With one:
  - no session -> click sends to /login (user request 2026-08-14/2026-09-02:
    stay visible on the public page rather than hide, since an anonymous
    visitor should be able to discover that logging in unlocks it)
  - session -> toggles self-register/self-unregister via
    server/api/tournament-registrations/self-*.post.ts
-->
<script setup lang="ts">
import type { Tournament } from '~/types'

interface Props {
  tournament?: Tournament | null
}

const { tournament = null } = defineProps<Props>()

const { t } = useI18n()
const toast = useToast()
const session = useSupabaseSession()

function registerComingSoon() {
  toast.add({
    title: t('event.calendar.registerComingSoonTitle'),
    description: t('event.calendar.registerComingSoonDescription'),
    color: 'info'
  })
}

const { data: myRegistrations } = useMyTournamentRegistrationsQuery()
const isRegistered = computed(() => !!tournament && (myRegistrations.value ?? [])
  .some(registration => registration.tournamentUuid === tournament.uuid))

const { selfRegister, selfUnregister } = useMyTournamentRegistrationMutations()
const isPending = computed(() => selfRegister.isLoading.value || selfUnregister.isLoading.value)

// Can always leave a 'registered' row, but can only join a tournament
// whose registrations are actually open — same rule enforced server-side
// in self-register.post.ts.
const canRegister = computed(() => tournament?.status === 'registration_open')

// Shop organizers (Magman etc.) are reference-only — Pauperwave doesn't run
// their registrations, so no Iscriviti/Disiscriviti at all, same rule
// self-register.post.ts enforces server-side.
const isExternalOrganizer = computed(() => tournament?.organizerType === 'shop')

function onClick() {
  if (!tournament) {
    registerComingSoon()
    return
  }
  if (!session.value) {
    navigateTo('/login')
    return
  }
  if (isRegistered.value) {
    selfUnregister.mutate(tournament.uuid)
  } else {
    selfRegister.mutate(tournament.uuid)
  }
}
</script>

<template>
  <UButton
    v-if="!isExternalOrganizer"
    :label="isRegistered ? $t('event.calendar.unregister') : $t('event.calendar.register')"
    :icon="isRegistered ? ICONS.removePlayer : ICONS.addPlayer"
    :color="isRegistered ? 'neutral' : 'primary'"
    :variant="isRegistered ? 'outline' : 'solid'"
    size="sm"
    :loading="isPending"
    :disabled="!!tournament && !!session && !canRegister && !isRegistered"
    @click="onClick"
  />
</template>
