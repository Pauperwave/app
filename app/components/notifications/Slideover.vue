<!-- app\components\notifications\Slideover.vue -->
<script setup lang="ts">
import { isThisWeek, isToday } from 'date-fns'
import { formatTimeAgo } from '@vueuse/core'
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import type { Notification } from '~/types'
import { ICONS } from '~/utils/icons'

const { isNotificationsSlideoverOpen } = useDashboard()
const { t } = useI18n()

const { data: notifications } = await useFetch<Notification[]>('/api/notifications')

type NotificationPeriod = 'today' | 'thisWeek' | 'earlier'

const periodOf = (date: string): NotificationPeriod => {
  const parsed = new Date(date)
  if (isToday(parsed)) return 'today'
  if (isThisWeek(parsed, { weekStartsOn: 1 })) return 'thisWeek'
  return 'earlier'
}

const tabs: TabsItem[] = [{
  value: 'today',
  label: t('notificationsSlideover.tabs.today'),
  icon: ICONS.lightMode
}, {
  value: 'thisWeek',
  label: t('notificationsSlideover.tabs.thisWeek'),
  icon: ICONS.calendar
}, {
  value: 'earlier',
  label: t('notificationsSlideover.tabs.earlier'),
  icon: ICONS.history
}]

const activePeriod = ref<NotificationPeriod>('today')

const filteredNotifications = computed(() => (notifications.value ?? [])
  .filter(notification => periodOf(notification.date) === activePeriod.value))

// Placeholder actions: no backend endpoint to mark-as-read/dismiss yet, same
// scaffold state as MembersList.vue's row menu.
const notificationActions: DropdownMenuItem[] = [{
  label: t('notificationsSlideover.markAsRead'),
  icon: ICONS.confirm
}, {
  label: t('notificationsSlideover.dismiss'),
  icon: ICONS.close
}]
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    :title="$t('notificationsSlideover.title')"
    inset
    :ui="{ content: 'rounded-xl', body: 'p-0 overflow-hidden' }"
  >
    <template #body>
      <div class="flex flex-col h-full">
        <UTabs
          v-model="activePeriod"
          :items="tabs"
          :content="false"
          color="neutral"
          size="md"
          :ui="BOXED_TABS_UI"
        />

        <div class="flex-1 overflow-y-auto px-2 py-3 sm:px-3">
          <EmptyState
            v-if="!filteredNotifications.length"
            :message="$t('notificationsSlideover.empty')"
          />

          <template v-else>
            <div
              v-for="notification in filteredNotifications"
              :key="notification.id"
              class="group px-3 py-4 rounded-md hover:bg-elevated/50 flex items-start gap-5"
            >
              <UChip color="error" :show="!!notification.unread" inset>
                <UAvatar
                  v-bind="notification.sender.avatar"
                  :alt="notification.sender.name"
                  size="xl"
                />
              </UChip>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center justify-start gap-2">
                    <span class="text-highlighted font-medium truncate">{{ notification.sender.name }}</span>

                    <time
                      :datetime="notification.date"
                      class="text-muted text-xs whitespace-nowrap"
                      v-text="formatTimeAgo(new Date(notification.date))"
                    />
                  </div>

                  <UDropdownMenu :items="notificationActions" :content="{ align: 'end' }">
                    <UButton
                      :icon="ICONS.ellipsisVertical"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                    />
                  </UDropdownMenu>
                </div>

                <p class="text-dimmed truncate text-sm">
                  {{ notification.body }}
                </p>

                <div class="hidden group-hover:flex gap-2 mt-2">
                  <UButton
                    :label="t('notificationsSlideover.ignore')"
                    color="neutral"
                    variant="soft"
                    size="xs"
                  />
                  <UButton
                    :label="t('notificationsSlideover.accept')"
                    color="primary"
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </USlideover>
</template>
