<!-- app\components\ui\AssociateTypeBadge.vue -->
<!-- Extracted from useAssociatesRenderers.ts's renderAssociateTypeBadge (h()-only, unusable in
     a template): one component used as a table cell (h(AssociateTypeBadge, { type })) and
     directly in associate/[slug].vue's profile header. -->
<script setup lang="ts">
import type { Associate } from '~/types'

const { type } = defineProps<{ type: Associate['associate_type'] }>()
const { t } = useI18n()

// No fallback for null: every associate should have a type in the DB (pre-existing nulls were
// backfilled): a blank cell would mean the data went inconsistent again and should stay visible,
// not be masked behind a default badge
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
