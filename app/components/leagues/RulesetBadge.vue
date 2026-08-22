<!-- app\components\leagues\RulesetBadge.vue -->
<!--
  Same permission-gated quick-change pattern as StatusBadge.vue — a ruleset
  picker behind an otherwise plain badge (2026-08-22). Extracted so the grid
  card's badge row always renders something instead of collapsing to zero
  height when league.ruleset is null, which made ListCard.vue's loading
  skeleton (always reserving a badge-sized bar there) mismatch a real card
  with no ruleset set — this fixes the mismatch and doubles as an inline
  "set ruleset" affordance, same idea as StatusBadge.vue's own dropdown.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { League } from '~/types'

const { league } = defineProps<{ league: League }>()
const { t } = useI18n()
const { can } = useUserRole()
const toast = useToast()

const { data: rulesets } = useRulesetsQuery()
const { setRuleset } = useLeaguesMutations()

async function changeRuleset(rulesetUuid: string | null) {
  try {
    await setRuleset.mutateAsync({ id: league.id, rulesetUuid })
  } catch (err) {
    toast.add({
      title: t('league.rulesetChangeErrorTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: t('league.addModal.fields.selectRuleset'),
    checked: !league.rulesetUuid,
    type: 'checkbox' as const,
    onSelect: () => changeRuleset(null)
  },
  ...(rulesets.value ?? []).map(ruleset => ({
    label: ruleset.name,
    checked: ruleset.uuid === league.rulesetUuid,
    type: 'checkbox' as const,
    onSelect: () => changeRuleset(ruleset.uuid)
  }))
])
</script>

<template>
  <UDropdownMenu
    v-if="can('manage-tournaments')"
    :items="items"
    :content="{ align: 'end' }"
    @click.stop.prevent
  >
    <UBadge
      color="neutral"
      variant="subtle"
      :icon="ICONS.bookOpen"
      class="shrink-0 cursor-pointer"
    >
      {{ league.ruleset ?? t('league.addModal.fields.selectRuleset') }}
    </UBadge>
  </UDropdownMenu>

  <UBadge
    v-else
    color="neutral"
    variant="subtle"
    :icon="ICONS.bookOpen"
    class="shrink-0"
  >
    {{ league.ruleset ?? t('league.addModal.fields.selectRuleset') }}
  </UBadge>
</template>
