<!-- app\components\associates\single\HeaderCard.vue -->
<script setup lang="ts">
import type { Associate } from '~/types'

const { associate } = defineProps<{ associate: Associate }>()

// The reverse of players/[playerId]/index.vue's "Vedi la scheda associato" link: not every
// associate has a linked player row (players are created on the first tesseramento-adjacent login,
// not at signup), so this can be null
const { data: players } = usePlayersQuery()
const player = computed(() => players.value?.find(
  item => item.associate_uuid === associate.uuid) ?? null)

// Linked to the bot but with no Telegram username: there is no profile to link to.
const { data: telegramLinks } = useAssociateTelegramUsernamesQuery()
const hasNoTelegramUsername = computed(() =>
  !associate.has_no_telegram
  && !!telegramLinks.value?.has(associate.uuid)
  && !telegramLinks.value.get(associate.uuid))

const avatar = computed(() => generatePlayerAvatar(associate.id))
</script>

<template>
  <UCard>
    <div class="flex flex-wrap items-center gap-4">
      <UAvatar
        :src="avatar"
        :alt="`${associate.first_name} ${associate.last_name}`"
        size="3xl"
        :ui="{ root: 'size-24', fallback: 'text-2xl' }"
      />
      <div class="flex-1 min-w-0">
        <h2 class="text-xl font-semibold truncate">
          {{ associate.first_name }} {{ associate.last_name }}
        </h2>
        <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
          <MembershipStatusBadge :status="associate.membership_status" />
          <AssociateNumberBadge :number="associate.pauperwave_associate_number" />
          <AssociateTypeBadge :type="associate.associate_type" />
          <UBadge
            v-if="associate.has_no_telegram"
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
        </div>

        <NuxtLink
          v-if="player?.first_name && player?.last_name"
          :to="`/players/${slugify(`${player.first_name} ${player.last_name}`)}`"
          class="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1.5"
        >
          <UIcon :name="ICONS.gameplay" class="size-4" />
          {{ $t('associate.detail.viewPlayerProfile') }}
        </NuxtLink>
      </div>
    </div>
  </UCard>
</template>
