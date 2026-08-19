<!-- app\components\ui\AssociateTypeBadge.vue -->
<!--
  Extracted 2026-08-19 out of useAssociatesRenderers.ts's renderAssociateTypeBadge
  (h()-only, couldn't be used directly in a template) — one component now
  used both as a table cell (h(AssociateTypeBadge, { type })) and directly in
  associate/[slug].vue's profile header.
-->
<script setup lang="ts">
import type { Associate } from '~/types'

const { type } = defineProps<{ type: Associate['associate_type'] }>()
const { t } = useI18n()

// No fallback for null: every associate should have a type in the DB (fixed
// via migration 2026-08-10, backfilling the pre-existing nulls) — a blank
// cell here would mean the data went inconsistent again, and should stay
// visible as that (nothing rendered) rather than being masked behind a
// default badge.
const badge = computed(() => type ? ASSOCIATE_TYPE_BADGE_CONFIG[type] : null)
</script>

<template>
  <UBadge
    v-if="badge && type"
    variant="subtle"
    class="gap-1.5"
    v-bind="badge"
  >
    {{ t(`associate.types.${type}`) }}
  </UBadge>
</template>
