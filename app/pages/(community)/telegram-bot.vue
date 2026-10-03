<!-- app\pages\(community)\telegram-bot.vue -->
<script lang="ts" setup>
// Informational page about the Telegram bot: what it is, how to link an account and the commands.
// Static on purpose, open to every logged-in role (no data to load).
const { t } = useI18n()

useSeoMeta({ title: () => t('telegramBot.breadcrumb') })

const BOT_URL = 'https://t.me/PauperwaveBot'
const linkSteps = ['open', 'email', 'done'] as const
</script>

<template>
  <UDashboardPanel id="telegram-bot">
    <template #header>
      <UDashboardNavbar :title="$t('telegramBot.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 max-w-3xl">
        <UPageCard
          title="@PauperwaveBot"
          :description="$t('telegramBot.intro')"
          :icon="ICONS.telegramBot"
        >
          <UButton
            :to="BOT_URL"
            target="_blank"
            :icon="ICONS.telegram"
            :label="$t('telegramBot.open')"
            class="self-start"
          />
        </UPageCard>

        <UPageCard
          :title="$t('telegramBot.link.title')"
          :description="$t('telegramBot.link.description')"
        >
          <ol class="list-decimal pl-5 flex flex-col gap-1 text-sm">
            <li
              v-for="step in linkSteps"
              :key="step"
            >
              {{ $t(`telegramBot.link.steps.${step}`) }}
            </li>
          </ol>
          <p class="text-sm text-muted">
            {{ $t('telegramBot.link.note') }}
          </p>
        </UPageCard>

        <UPageCard
          :title="$t('telegramBot.commands.title')"
          :description="$t('telegramBot.commands.description')"
          :ui="{ container: 'gap-6' }"
        >
          <section
            v-for="group in TELEGRAM_BOT_COMMAND_GROUPS"
            :key="group.id"
            class="flex flex-col gap-2"
          >
            <h3 class="text-sm font-semibold">
              {{ $t(`telegramBot.commands.groups.${group.id}`) }}
            </h3>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="command in group.commands"
                :key="command.name"
                class="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <code class="font-mono text-highlighted">/{{ command.name }}</code>
                <span class="text-muted">
                  {{ $t(`telegramBot.commands.items.${command.name}`) }}
                </span>
                <UBadge
                  v-if="command.requiresLink"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ $t('telegramBot.commands.requiresLink') }}
                </UBadge>
              </li>
            </ul>
          </section>
        </UPageCard>

        <UPageCard
          :title="$t('telegramBot.notifications.title')"
          :description="$t('telegramBot.notifications.description')"
        />

        <UPageCard
          :title="$t('telegramBot.support.title')"
          :description="$t('telegramBot.support.description')"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
