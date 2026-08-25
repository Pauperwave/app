<!-- app\components\settings\MembersList.vue -->
<!--
  Wired to the real role system (2026-08-25 user request) — was the Nuxt UI
  dashboard template's unmodified scaffold: hardcoded /api/members names, a
  role <USelect> bound to nothing, and "Modifica"/"Rimuovi" dropdown items
  with no handler either (neither maps to anything real in this domain —
  dropped rather than wired up). The select now calls assign_role
  (useMembersMutations.ts) directly on change.
-->
<script setup lang="ts">
import type { Member, MemberRole } from '#shared/types/settings'

const { members } = defineProps<{ members: Member[] }>()

const { t } = useI18n()
const toast = useToast()
const { isSuperAdmin } = useUserRole()
const { assignRole } = useMembersMutations()

// A caller who isn't super_admin can't grant super_admin at all (assign_role
// itself enforces this — see its migration 20260823130000) — filtered out of
// the options here too, so the control doesn't offer a choice that would
// just come back as a permission error.
const roleOptions = computed(() => (['player', 'organizer', 'admin', 'super_admin'] as const)
  .filter(role => role !== 'super_admin' || isSuperAdmin.value)
  .map(role => ({ label: t(`settings.members.roles.${role}`), value: role, icon: ROLE_ICON[role] })))

// Same reasoning, the other direction: an existing super_admin's role can
// only be touched by another super_admin (assign_role's own guard) — a
// role_locked row (e.g. the account owner) can never be changed by anyone.
// Both are disabled here rather than left to fail on submit.
function isRoleSelectDisabled(member: Member) {
  return member.roleLocked || (member.role === 'super_admin' && !isSuperAdmin.value)
}

const changingUserId = ref<string | null>(null)
async function onRoleChange(member: Member, role: MemberRole) {
  changingUserId.value = member.userId
  try {
    await assignRole.mutateAsync({ userId: member.userId, role })
  } catch (err) {
    toast.add({
      title: t('settings.members.roleChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    changingUserId.value = null
  }
}
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="member in members"
      :key="member.userId"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
    >
      <AssociateTag :name="member.name" :associate-uuid="member.associateUuid" size="md" />

      <USelect
        :model-value="member.role"
        :items="roleOptions"
        value-key="value"
        color="neutral"
        class="w-44"
        :disabled="isRoleSelectDisabled(member)"
        :loading="changingUserId === member.userId"
        @update:model-value="(role) => onRoleChange(member, role as MemberRole)"
      >
        <template #leading="{ modelValue, ui }">
          <UIcon
            v-if="modelValue"
            :name="ROLE_ICON[modelValue as MemberRole]"
            :class="ui.leadingIcon()"
          />
        </template>

        <template #item="{ item }">
          <UIcon :name="item.icon" class="size-5 shrink-0" />
          <span>{{ item.label }}</span>
        </template>
      </USelect>
    </li>
  </ul>
</template>
