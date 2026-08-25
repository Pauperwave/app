<!-- app\pages\(settings)\settings\members.vue -->
<script setup lang="ts">
definePageMeta({ permission: 'access-settings' })

const { t } = useI18n()

useSeoMeta({ title: () => t('settings.layout.links.members') })

const { data: membersData } = useMembersQuery()
const members = computed(() => membersData.value ?? [])
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
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch' }"
    >
      <SettingsMembersList :members="members" />
    </UPageCard>
  </div>
</template>
