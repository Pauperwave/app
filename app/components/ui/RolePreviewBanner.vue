<!-- app\components\ui\RolePreviewBanner.vue -->
<script setup lang="ts">
// docs/architecture/roles.md §1 "view as" feature: persistent and hard to miss while active. It
// only fakes what the UI shows (can()/isStaff), never real data access (RLS/BFF run against the
// real auth.uid()), so a super_admin must never mistake "what I see" for "what I can still do"
const { role, isPreviewing, setRolePreview } = useUserRole()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="isPreviewing"
    class="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-warning py-1.5 text-sm text-inverted"
  >
    <UIcon :name="ICONS.show" class="size-4" />
    <span>{{ t('rolePreview.banner', { role: t(`settings.members.roles.${role}`) }) }}</span>
    <UButton
      :label="t('rolePreview.exit')"
      size="xs"
      color="neutral"
      variant="solid"
      @click="setRolePreview(null)"
    />
  </div>
</template>
