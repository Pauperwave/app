<!-- app\pages\(settings)\settings\members.vue -->
<script setup lang="ts">
import type { Member } from '~/types'

const { data: members } = await useFetch<Member[]>('/api/members', { default: () => [] })

const q = ref('')

const filteredMembers = computed(() => {
  return members.value.filter(member => member.name.search(new RegExp(q.value, 'i')) !== -1)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <UAlert
      color="neutral"
      variant="subtle"
      :icon="ICONS.permissions"
      :title="$t('settings.members.permissionsAlert.title')"
      :description="$t('settings.members.permissionsAlert.description')"
      :actions="[{
        label: $t('settings.members.permissionsAlert.action'),
        color: 'neutral',
        variant: 'subtle',
        to: '/settings/permissions'
      }]"
    />

    <UPageCard
      :title="$t('settings.members.title')"
      :description="$t('settings.members.description')"
      variant="naked"
      orientation="horizontal"
    >
      <UButton
        :label="$t('settings.members.invitePeople')"
        color="neutral"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard
      variant="subtle"
      :ui="{
        container: 'p-0 sm:p-0 gap-y-0',
        wrapper: 'items-stretch',
        header: 'p-4 mb-0 border-b border-default'
      }"
    >
      <template #header>
        <UInput
          v-model="q"
          :icon="ICONS.search"
          :placeholder="$t('settings.members.searchPlaceholder')"
          autofocus
          class="w-full"
        />
      </template>

      <SettingsMembersList :members="filteredMembers" />
    </UPageCard>
  </div>
</template>
