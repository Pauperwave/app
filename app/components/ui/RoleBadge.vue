<!-- app\components\ui\RoleBadge.vue -->
<!--
  A member's role as a badge — icon + label, extracted out of
  usePlayersTableColumns.ts's own inline h(UBadge, ...) once /players got a
  "Ruolo" column (user request, 2026-08-25). Same ROLE_ICON map
  (app/utils/roles.ts) as MembersList.vue's role select, the players
  "Promuovi a" submenu, and /settings/permissions' column headers — one
  place keeps every role icon in sync.
-->
<script setup lang="ts">
import type { MemberRole } from '#shared/types/settings'

const { role } = defineProps<{ role: MemberRole }>()

const { t } = useI18n()
</script>

<template>
  <UBadge :color="ROLE_COLOR[role]" variant="subtle" :icon="ROLE_ICON[role]">
    {{ t(`settings.members.roles.${role}`) }}
  </UBadge>
</template>
