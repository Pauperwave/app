<!-- app\components\ui\MembershipStatusBadge.vue -->
<!--
  Extracted 2026-08-19 out of the roster's inline membership_status cell and
  associate/[slug].vue's own currentStatusBadge (duplicated markup, same
  MEMBERSHIP_STATUS_BADGE_CONFIG lookup + associate.statusLabels.* i18n key
  in both places) — one component now used as a table cell
  (h(MembershipStatusBadge, { status })) and directly in the detail page's
  template.
-->
<script setup lang="ts">
import type { Associate } from '~/types'

const { status } = defineProps<{ status: Associate['membership_status'] }>()
const { t } = useI18n()

const badge = computed(() => MEMBERSHIP_STATUS_BADGE_CONFIG[status])
</script>

<template>
  <UBadge
    variant="subtle"
    class="capitalize gap-1.5"
    v-bind="badge"
  >
    {{ t(`associate.statusLabels.${status}`) }}
  </UBadge>
</template>
