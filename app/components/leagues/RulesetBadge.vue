<!-- app\components\leagues\RulesetBadge.vue -->
<!-- The same permission-gated quick-change pattern as StatusBadge.vue: a ruleset picker behind
     an otherwise plain badge. Extracted so the grid card's badge row always renders something
     instead of collapsing to zero height when league.ruleset is null, which made ListCard.vue's
     loading skeleton (always reserving a badge-sized bar) mismatch a real card with no ruleset;
     it also doubles as an inline "set ruleset" affordance, like StatusBadge.vue's dropdown. -->
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
  <!-- Wrapping native span, not relying on UDropdownMenu/UBadge's attrs fallthrough for
       @click.stop (unreliable: the click still bubbled to the card's onCardClick and
       navigated), like LocationsListCard.vue's "Apri in Maps" link. `contents`: a plain inline
       span's line box was 3px taller than the badge, misaligning it against its
       BadgesFormatBadge sibling in Card.vue's row; display:contents removes the wrapper from
       the box model (it still stops the click) -->
  <span class="contents" @click.stop>
    <UTooltip
      v-if="can('manage-tournaments')"
      :text="t('common.editableBadgeHint')"
    >
      <span class="inline-flex">
        <UDropdownMenu
          :items="items"
          :content="{ align: 'end' }"
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
      </span>
    </UTooltip>

    <UBadge
      v-else
      color="neutral"
      variant="subtle"
      :icon="ICONS.bookOpen"
      class="shrink-0"
    >
      {{ league.ruleset ?? t('league.addModal.fields.selectRuleset') }}
    </UBadge>
  </span>
</template>
