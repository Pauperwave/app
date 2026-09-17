// app\composables\rulesets\useRulesetsMutations.ts
// Ruleset CRUD, restored from league's RulesetFormModal/useRulesetMutations
// flow (user request, 2026-09-17) — createRuleset/updateRuleset are
// 'manage-rulesets' (organizer), deleteRuleset is 'delete-ruleset' (admin,
// enforced server-side); see permissions.ts's own comment on that split.
import type { RulesetPointValues } from '~/composables/tournaments/pairing/useCommanderScoring'

export interface RulesetFormPoints extends RulesetPointValues {
  participation: number
}

export function useRulesetsMutations() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  function invalidateRulesets() {
    queryCache.invalidateQueries({ key: RULESETS_WITH_POINTS_KEY })
    queryCache.invalidateQueries({ key: RULESETS_KEY })
  }

  const createRuleset = useMutation({
    mutation: (payload: { name: string, points: RulesetFormPoints }) =>
      $fetch('/api/rulesets/create', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('ruleset.manage.saveError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateRulesets
  })

  const updateRuleset = useMutation({
    mutation: (payload: { rulesetUuid: string, name: string, points: RulesetFormPoints }) =>
      $fetch('/api/rulesets/update', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('ruleset.manage.saveError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateRulesets
  })

  const deleteRuleset = useMutation({
    mutation: (payload: { rulesetUuid: string }) =>
      $fetch('/api/rulesets/delete', { method: 'POST', body: payload }),
    onError: (error) => {
      toast.add({
        title: t('ruleset.manage.deleteError'),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: invalidateRulesets
  })

  return { createRuleset, updateRuleset, deleteRuleset }
}
