<!-- app\components\settings\AssignRoleModal.vue -->
<!--
  "Invita persone" repurposed (2026-08-25 user request) — the template's own
  email-invite framing didn't fit this app: auth is self-service OTP, staff
  never send account invites. This searches existing associates and assigns
  a role directly, same assign_role call as MembersList.vue's own role
  <USelect> and usePlayersRowActions.ts's "Promuovi a" — all three stay in
  sync since they share useMembersMutations.ts/useMembersQuery.ts.

  Only account-linked associates (players.user_id not null) are searchable —
  assign_role structurally can't run without one, same constraint as the
  "Promuovi a" submenu's own disabled-with-explanation state.
-->
<script setup lang="ts">
import type { MemberRole } from '#shared/types/settings'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()
const { isSuperAdmin } = useUserRole()
const { assignRole } = useMembersMutations()
const { data: playersData } = usePlayersQuery()
const { data: membersData } = useMembersQuery()

const associateOptions = computed(() => (playersData.value ?? [])
  .filter((player): player is typeof player & { user_id: string, associate_uuid: string } =>
    !!player.user_id && !!player.associate_uuid)
  .map(player => ({
    label: `${player.first_name} ${player.last_name}`,
    description: player.email_address ?? undefined,
    value: player.associate_uuid,
    userId: player.user_id
  }))
  .sort((a, b) => a.label.localeCompare(b.label)))

const selectedAssociateUuid = ref<string | undefined>(undefined)
const selectedAssociate = computed(() =>
  associateOptions.value.find(option => option.value === selectedAssociateUuid.value) ?? null)

const memberByAssociateUuid = computed(() =>
  new Map((membersData.value ?? []).map(member => [member.associateUuid, member])))
const currentMember = computed(() => selectedAssociateUuid.value
  ? memberByAssociateUuid.value.get(selectedAssociateUuid.value)
  : undefined)

// Assigning 'player' isn't offered here — this modal is specifically for
// granting a role, resetting one back to 'player' already has its place on
// the main list's own row select. super_admin filtered out for non-super-
// admin callers, same as MembersList.vue/usePlayersRowActions.ts. The
// selected associate's current role is disabled — picking it again would be
// a no-op — same rule usePlayersRowActions.ts's "Promuovi a" submenu applies.
const roleOptions = computed(() => (['organizer', 'admin', 'super_admin'] as const)
  .filter(role => role !== 'super_admin' || isSuperAdmin.value)
  .map(role => ({
    label: t(`settings.members.roles.${role}`),
    value: role,
    icon: ROLE_ICON[role],
    disabled: role === currentMember.value?.role
  })))

type AssignableRole = Exclude<MemberRole, 'player'>
const selectedRole = ref<AssignableRole | undefined>(undefined)

// Reactive to the associate picker (user request, 2026-08-25) — jumping to
// a different associate now resets the role field to reflect *their*
// current role (or clears it if they're a plain player, since 'player'
// isn't a selectable target here) instead of carrying over whatever was
// picked for the previous selection.
watch(selectedAssociateUuid, () => {
  const currentRole = currentMember.value?.role
  selectedRole.value = currentRole && currentRole !== 'player' ? currentRole : undefined
})

// Existing super_admin can only be touched by another super_admin, a
// role_locked row never at all — same guard as the other two role-change
// surfaces.
const roleSelectDisabled = computed(() => !selectedAssociate.value
  || currentMember.value?.roleLocked
  || (currentMember.value?.role === 'super_admin' && !isSuperAdmin.value))

watch(open, (isOpen) => {
  if (!isOpen) {
    selectedAssociateUuid.value = undefined
    selectedRole.value = undefined
  }
})

const submitting = ref(false)
async function onSubmit() {
  if (!selectedAssociate.value || !selectedRole.value) return
  submitting.value = true
  try {
    await assignRole.mutateAsync({
      userId: selectedAssociate.value.userId,
      role: selectedRole.value
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('settings.members.roleChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('settings.members.assignRoleModal.title')"
    :description="t('settings.members.assignRoleModal.description')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="t('settings.members.assignRoleModal.associateLabel')">
          <USelectMenu
            v-model="selectedAssociateUuid"
            :items="associateOptions"
            value-key="value"
            :placeholder="t('settings.members.assignRoleModal.associatePlaceholder')"
            :search-input="{
              placeholder: t('settings.members.assignRoleModal.associateSearchPlaceholder')
            }"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('settings.members.assignRoleModal.roleLabel')">
          <USelect
            v-model="selectedRole"
            :items="roleOptions"
            value-key="value"
            :placeholder="t('settings.members.assignRoleModal.rolePlaceholder')"
            :disabled="roleSelectDisabled"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="t('settings.members.assignRoleModal.submit')"
          color="primary"
          variant="solid"
          :disabled="!selectedAssociate || !selectedRole || roleSelectDisabled"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
