<!-- app\components\ui\AssociateTag.vue -->

<!--
  Renamed from PlayerTag 2026-08-18 — it's not player-specific at all (see
  the "Ricevuto da"/external-payer note below, and it's about to render
  staff members too via the audit-trail columns). Nome persona con avatar,
  tramite UUser. L'avatar è generato
  deterministicamente con DiceBear (stesso pattern di generatePlayerAvatar()
  in MagicTheGathering/league, che però lo usa con UAvatar/PlayerNameTag —
  qui si usa UUser al suo posto).

  associateUuid (opzionale): quando presente, un hover mostra un popover con
  lo stato di tesseramento live (membership_status) e l'anno dell'ultimo
  rinnovo, letti dalla stessa cache di useAssociatesQuery.ts già in uso nel
  resto dell'app — nessuna richiesta aggiuntiva. Senza associateUuid (es. un
  pagatore esterno o "Ricevuto da", che non è per forza un associato) resta il
  semplice nome+avatar di prima. Per ora solo questi due dati — da ampliare.
-->
<script setup lang="ts">
import { upperFirst } from 'scule'

const { name, associateUuid, highlightQuery } = defineProps<{
  name: string
  associateUuid?: string | null
  // Opt-in (2026-08-19, user request): highlights the search box's own
  // match in the displayed name, same HighlightMatch.vue every other
  // search result column uses. Every existing call site omits this and
  // keeps rendering the plain name.
  highlightQuery?: string
}>()

const avatar = computed(() => ({ src: generatePlayerAvatar(name), alt: name }))

const { data: associatesData } = useAssociatesQuery()

const associate = computed(() => associateUuid
  ? (associatesData.value ?? []).find(a => a.uuid === associateUuid) ?? null
  : null)

const membershipBadge = computed(() => associate.value
  ? MEMBERSHIP_STATUS_BADGE_CONFIG[associate.value.membership_status] ?? { color: 'neutral' as const, icon: ICONS.help }
  : null)
</script>

<template>
  <UPopover v-if="associate" mode="hover" :open-delay="200">
    <UUser
      :name="name"
      :avatar="avatar"
      size="sm"
      class="cursor-default"
    >
      <template v-if="highlightQuery" #name>
        <HighlightMatch :text="name" :query="highlightQuery" />
      </template>
    </UUser>

    <template #content>
      <div class="p-3 space-y-1.5 text-sm min-w-48">
        <UBadge
          variant="subtle"
          class="capitalize gap-1.5"
          v-bind="membershipBadge"
        >
          {{ upperFirst(associate.membership_status.replace('_', ' ')) }}
        </UBadge>
        <p class="text-muted">
          {{ $t('common.associateTag.lastRenewal') }}:
          {{ associate.latest_renewal_year ?? $t('common.associateTag.neverRenewed') }}
        </p>
      </div>
    </template>
  </UPopover>

  <UUser
    v-else
    :name="name"
    :avatar="avatar"
    size="sm"
  >
    <template v-if="highlightQuery" #name>
      <HighlightMatch :text="name" :query="highlightQuery" />
    </template>
  </UUser>
</template>
