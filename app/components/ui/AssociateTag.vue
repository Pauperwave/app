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
import type { UserProps } from '@nuxt/ui'

const {
  name, associateUuid, highlightQuery, size = 'sm', strikethrough = false
} = defineProps<{
  name: string
  associateUuid?: string | null
  // Opt-in (2026-08-19, user request): highlights the search box's own
  // match in the displayed name, same HighlightMatch.vue every other
  // search result column uses. Every existing call site omits this and
  // keeps rendering the plain name.
  highlightQuery?: string
  // Forwarded to UUser — defaults to 'sm' (every existing call site's
  // implicit size before this prop existed). Added for AcceptancePicker's
  // own listbox rows, which read too small at the default (user request,
  // 2026-08-24).
  size?: UserProps['size']
  // Strikes through the name — no-show indicator in AcceptancePicker's
  // "Pre-registrati" table (user request, 2026-08-24), generic enough for
  // any other "this person is marked as not participating" use later.
  strikethrough?: boolean
}>()

const avatar = computed(() => ({ src: generatePlayerAvatar(name), alt: name }))

const { data: associatesData } = useAssociatesQuery()

const associate = computed(() => associateUuid
  ? (associatesData.value ?? []).find(a => a.uuid === associateUuid) ?? null
  : null)

const membershipBadge = computed(() => associate.value
  ? MEMBERSHIP_STATUS_BADGE_CONFIG[associate.value.membership_status]
  : null)
</script>

<template>
  <UPopover v-if="associate" mode="hover" :open-delay="200">
    <UUser
      :name="name"
      :avatar="avatar"
      :size="size"
      class="cursor-default"
    >
      <template v-if="highlightQuery || strikethrough" #name>
        <span :class="{ 'line-through text-dimmed': strikethrough }">
          <HighlightMatch v-if="highlightQuery" :text="name" :query="highlightQuery" />
          <template v-else>{{ name }}</template>
        </span>
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

  <!-- fallow-ignore-next-line code-duplication -- the #name slot content
       mirrors the popover branch above verbatim; Vue templates have no
       lightweight way to share a named-slot fragment across two UUser
       instances without a wrapper component, not worth it for 6 lines. -->
  <UUser
    v-else
    :name="name"
    :avatar="avatar"
    :size="size"
  >
    <template v-if="highlightQuery || strikethrough" #name>
      <span :class="{ 'line-through text-dimmed': strikethrough }">
        <HighlightMatch v-if="highlightQuery" :text="name" :query="highlightQuery" />
        <template v-else>{{ name }}</template>
      </span>
    </template>
  </UUser>
</template>
