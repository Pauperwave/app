<!-- app\components\telegram\CommandGroupCard.vue -->
<script lang="ts" setup>
// One section of the bot's command catalog (botCommands.ts) on the /telegram-bot info page
interface Props {
  group: (typeof TELEGRAM_BOT_COMMAND_GROUPS)[number]
}

const { group } = defineProps<Props>()

const groupIcons: Record<string, string> = {
  general: ICONS.settingsGear,
  competitions: ICONS.standings,
  profile: ICONS.player,
  tournament: ICONS.battle,
  cards: ICONS.cardSearch,
  dice: ICONS.dice,
  support: ICONS.messageCircle
}
</script>

<template>
  <UPageCard
    :title="$t(`telegramBot.commands.groups.${group.id}`)"
    :description="$t(`telegramBot.commands.groupDescriptions.${group.id}`)"
    :icon="groupIcons[group.id]"
  >
    <ul class="flex flex-col divide-y divide-default">
      <li
        v-for="command in group.commands"
        :key="command.name"
        class="flex flex-col py-2 text-sm first:pt-0 last:pb-0"
      >
        <span class="flex flex-wrap items-center gap-x-2">
          <a
            v-if="botCommandUrl(command)"
            :href="botCommandUrl(command) ?? undefined"
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-primary hover:underline"
          >/{{ command.name }}</a>
          <code
            v-else
            class="font-mono text-highlighted"
          >/{{ command.name }}</code>
          <UBadge
            v-if="command.requiresLink"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ $t('telegramBot.commands.requiresLink') }}
          </UBadge>
          <UBadge
            v-if="!botCommandUrl(command)"
            color="neutral"
            variant="outline"
            size="sm"
          >
            {{ $t('telegramBot.commands.chatOnly') }}
          </UBadge>
        </span>
        <span class="text-muted">
          {{ $t(`telegramBot.commands.items.${command.name}`) }}
        </span>
      </li>
    </ul>
  </UPageCard>
</template>
