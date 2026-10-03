<!-- app\components\ui\AssociateTag.vue -->

<!-- A person's name with avatar via UUser (renamed from PlayerTag: it isn't player-specific, as
     it also renders staff in the audit-trail columns and the "Ricevuto da"/external-payer
     cases). The avatar is generated deterministically with DiceBear (the same pattern as
     league's generatePlayerAvatar(), which uses it with UAvatar/PlayerNameTag; here UUser).
     associateUuid (optional): when present, a hover shows a popover with the live
     membership_status and the year of the last renewal, read from the same
     useAssociatesQuery.ts cache used elsewhere (no extra request). Without it (e.g. an external
     payer or "Ricevuto da", not necessarily an associate) it stays a plain name+avatar. Only
     these two data points for now. -->
<script setup lang="ts">
import { upperFirst } from 'scule'
import type { UserProps } from '@nuxt/ui'

const {
  name, associateUuid, highlightQuery, size = 'sm', strikethrough = false, surname
} = defineProps<{
  name: string
  associateUuid?: string | null
  // Opt-in: highlights the search box's match in the displayed name (HighlightMatch.vue, like every
  // search result column). Call sites that omit it render the plain name
  highlightQuery?: string
  // Forwarded to UUser; defaults to 'sm' (the implicit size of every call site before this prop).
  // Added for AcceptancePicker's listbox rows, which read too small by default
  size?: UserProps['size']
  // Strikes through the name: the no-show indicator in AcceptancePicker's "Pre-registrati" table,
  // generic enough for any "marked as not participating" use
  strikethrough?: boolean
  // Opt-in: when given, `name` renders plain and `surname` bold + text-primary, like league's
  // PlayerNameTag.vue (round-view card colors). Call sites that omit it render `name` as one plain
  // string. With `highlightQuery`, the search match is highlighted in both parts
  surname?: string
}>()

const avatar = computed(() => ({ src: generatePlayerAvatar(name), alt: name }))

const { data: associatesData } = useAssociatesQuery()

const { data: telegramUsernames } = useAssociateTelegramUsernamesQuery()

const associate = computed(() => associateUuid
  ? (associatesData.value ?? []).find(a => a.uuid === associateUuid) ?? null
  : null)

// Telegram, as far as the app can tell: not on it at all (error), linked to the bot but without
// a username so there's no profile to open (warning), or a link to the profile. Someone unlinked
// and not flagged is simply unknown.
const hasNoTelegram = computed(() => associate.value?.has_no_telegram ?? false)
const isLinkedToBot = computed(() =>
  !!associateUuid && !!telegramUsernames.value?.has(associateUuid))
const telegramUsername = computed(() => associateUuid && !hasNoTelegram.value
  ? telegramUsernames.value?.get(associateUuid) ?? null
  : null)
const hasNoTelegramUsername = computed(() =>
  !hasNoTelegram.value && isLinkedToBot.value && !telegramUsername.value)

// The associate page, where "Modifica associato" also edits the "non ha Telegram" flag.
const profilePath = computed(() => associate.value
  ? `/associate/${slugify(`${associate.value.first_name} ${associate.value.last_name}`)}`
  : null)

const membershipBadge = computed(() => associate.value
  ? MEMBERSHIP_STATUS_BADGE_CONFIG[associate.value.membership_status]
  : null)
</script>

<template>
  <UPopover
    v-if="associate"
    mode="hover"
    :open-delay="200"
  >
    <UUser
      :name="name"
      :avatar="avatar"
      :size="size"
      class="cursor-default"
    >
      <template v-if="surname || highlightQuery || strikethrough" #name>
        <span :class="{ 'line-through text-dimmed': strikethrough }">
          <template v-if="surname">
            <HighlightMatch
              v-if="highlightQuery"
              :text="name"
              :query="highlightQuery"
            />
            <template v-else>{{ name }}</template>
            {{ ' ' }}
            <span class="font-bold text-primary whitespace-nowrap">
              <HighlightMatch
                v-if="highlightQuery"
                :text="surname"
                :query="highlightQuery"
              />
              <template v-else>{{ surname }}</template>
            </span>
          </template>
          <HighlightMatch
            v-else-if="highlightQuery"
            :text="name"
            :query="highlightQuery"
          />
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
        <UBadge
          v-if="hasNoTelegram"
          :label="$t('associate.noTelegram.badge')"
          :icon="ICONS.noTelegram"
          color="error"
          variant="subtle"
        />
        <UBadge
          v-else-if="hasNoTelegramUsername"
          :label="$t('associate.noTelegramUsername.badge')"
          :icon="ICONS.telegramNoUsername"
          color="warning"
          variant="subtle"
        />
        <a
          v-else-if="telegramUsername"
          :href="`https://t.me/${telegramUsername}`"
          :aria-label="$t('common.associateTag.openTelegram', { name })"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-primary hover:underline"
        >
          <UIcon :name="ICONS.telegramLinked" class="size-4" />
          @{{ telegramUsername }}
        </a>
        <UButton
          v-if="profilePath"
          :to="profilePath"
          :label="$t('common.associateTag.openProfile')"
          :icon="ICONS.show"
          color="neutral"
          variant="soft"
          size="xs"
          block
          class="mt-1"
        />
      </div>
    </template>
  </UPopover>

  <UUser
    v-else
    :name="name"
    :avatar="avatar"
    :size="size"
  >
    <!-- fallow-ignore-next-line code-duplication -- mirrors the popover branch above -->
    <template v-if="surname || highlightQuery || strikethrough" #name>
      <span :class="{ 'line-through text-dimmed': strikethrough }">
        <template v-if="surname">
          <HighlightMatch
            v-if="highlightQuery"
            :text="name"
            :query="highlightQuery"
          />
          <template v-else>{{ name }}</template>
          {{ ' ' }}
          <span class="font-bold text-primary whitespace-nowrap">
            <HighlightMatch
              v-if="highlightQuery"
              :text="surname"
              :query="highlightQuery"
            />
            <template v-else>{{ surname }}</template>
          </span>
        </template>
        <HighlightMatch
          v-else-if="highlightQuery"
          :text="name"
          :query="highlightQuery"
        />
        <template v-else>{{ name }}</template>
      </span>
    </template>
  </UUser>
</template>
