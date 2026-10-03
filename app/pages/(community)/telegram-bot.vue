<!-- app\pages\(community)\telegram-bot.vue -->
<script lang="ts" setup>
// Informational page about the Telegram bot: your link state, what the bot is, how to link an
// account and the commands, each one opening in Telegram. Open to every logged-in role.
const { t } = useI18n()

useSeoMeta({ title: () => t('telegramBot.breadcrumb') })

const { data: myLink, isPending: linkPending, error: linkError } = useMyTelegramLinkQuery()
const linkSteps = ['open', 'email', 'done'] as const
const supportUrl = botCommandUrl({ name: 'supporto', requiresLink: false })
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
      <div class="flex flex-col gap-6">
        <USkeleton
          v-if="linkPending"
          class="h-20 w-full"
        />
        <UAlert
          v-else-if="linkError"
          color="neutral"
          variant="subtle"
          :icon="ICONS.warning"
          :title="$t('telegramBot.status.error')"
        />
        <UAlert
          v-else-if="myLink?.status === 'linked'"
          color="success"
          variant="subtle"
          :icon="ICONS.telegramLinked"
          :title="$t('telegramBot.status.linked')"
          :description="myLink.username
            ? $t('telegramBot.status.linkedAs', { username: `@${myLink.username}` })
            : $t('telegramBot.status.linkedDescription')"
        />
        <UAlert
          v-else-if="myLink?.status === 'not-linked'"
          color="warning"
          variant="subtle"
          :icon="ICONS.telegramNotLinked"
          :title="$t('telegramBot.status.notLinked')"
          :description="$t('telegramBot.status.notLinkedDescription')"
          :actions="[{
            label: $t('telegramBot.open'),
            to: TELEGRAM_BOT_URL,
            target: '_blank',
            color: 'warning',
            variant: 'solid'
          }]"
        />
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          :icon="ICONS.info"
          :title="$t('telegramBot.status.noAssociate')"
          :description="$t('telegramBot.status.noAssociateDescription')"
        />

        <div class="grid gap-4 sm:grid-cols-2">
          <UPageCard
            title="@PauperwaveBot"
            :description="$t('telegramBot.intro')"
            :icon="ICONS.telegramBot"
          >
            <UButton
              :to="TELEGRAM_BOT_URL"
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
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UPageCard
            :title="$t('telegramBot.notifications.title')"
            :description="$t('telegramBot.notifications.description')"
          />

          <UPageCard :title="$t('telegramBot.support.title')">
            <template #description>
              <i18n-t keypath="telegramBot.support.description">
                <template #command>
                  <a
                    :href="supportUrl ?? undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-mono text-primary hover:underline"
                  >/supporto</a>
                </template>
              </i18n-t>
            </template>
          </UPageCard>
        </div>

        <section class="flex flex-col gap-4">
          <div>
            <h2 class="text-lg font-semibold">
              {{ $t('telegramBot.commands.title') }}
            </h2>
            <p class="text-sm text-muted">
              {{ $t('telegramBot.commands.description') }}
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <TelegramCommandGroupCard
              v-for="group in TELEGRAM_BOT_COMMAND_GROUPS"
              :key="group.id"
              :group="group"
            />
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
