<!-- app\components\tournaments\fields\NotificationsFields.vue -->
<!--
  Telegram notifications + test flag for AddModal.vue/EditModal.vue — `state` is the SAME
  reactive object the parent binds to its own <UForm :state>, mutated directly (see
  OrganizerDataFields.vue). The test switch is super_admin only: such a tournament is
  invisible to everyone else (RLS), and the server rejects the field for anyone below.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

const { state } = defineProps<{ state: TournamentFormState }>()

const { can } = useUserRole()

// A test tournament starts with the notifications off, the switch can be turned back on.
watch(() => state.isTest, (isTest) => {
  if (isTest) state.telegramNotificationsEnabled = false
})
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="space-y-3">
    <UFormField
      name="telegramNotificationsEnabled"
      :description="$t('tournament.telegramNotifications.description')"
    >
      <USwitch
        v-model="state.telegramNotificationsEnabled"
        :label="$t('tournament.telegramNotifications.label')"
      />
    </UFormField>

    <UFormField
      v-if="can('mark-test-tournaments')"
      name="isTest"
      :description="$t('tournament.test.description')"
    >
      <USwitch
        v-model="state.isTest"
        :label="$t('tournament.test.label')"
      />
    </UFormField>
  </div>
</template>
