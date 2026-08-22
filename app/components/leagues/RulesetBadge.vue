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
  <!-- Wrapping native span, not relying on UDropdownMenu/UBadge's own attrs
       fallthrough for @click.stop (confirmed unreliable — the click still
       bubbled to the card's own onCardClick and navigated) — same "wrap in
       a plain element with click.stop" fix LocationsListCard.vue's own
       "Apri in Maps" link already uses for the same reason. `contents`:
       a plain inline span's own line box was 3px taller than the badge
       itself, misaligning it against its BadgesFormatBadge sibling in
       Card.vue's row — display:contents removes the wrapper from the box
       model entirely (it still fires/stops the click) so only the badge's
       own box remains. -->
  <span class="contents" @click.stop>
    <UDropdownMenu
      v-if="can('manage-tournaments')"
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
