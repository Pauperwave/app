// app\composables\leagues\useLeagueFormFields.ts
// Extracted out of AddModal.vue (2026-08-16, EditModal.vue needs the same
// schema + ruleset select options) — same reasoning as
// useTournamentFormFields.ts: only the initial `state` values and submit
// behavior differ between create and edit.
import * as v from 'valibot'
import type { InferOutput } from 'valibot'

function buildSchema(t: ReturnType<typeof useI18n>['t']) {
  return v.object({
    status: v.picklist(LEAGUE_STATUSES),
    name: v.pipe(v.string(), v.trim(), v.minLength(1, t('league.addModal.validation.nameRequired'))),
    rulesetUuid: v.optional(v.string())
  })
}

export type LeagueFormState = Partial<InferOutput<ReturnType<typeof buildSchema>>>

export function useLeagueFormFields() {
  const { t } = useI18n()

  const { data: rulesets } = useRulesetsQuery()

  const schema = buildSchema(t)

  const statusOptions = computed(() => LEAGUE_STATUSES.map(status => ({
    value: status,
    label: t(`league.addModal.statusOptions.${status}`),
    icon: LEAGUE_STATUS_ICONS[status],
    color: leagueStatusColor(status)
  })))

  const rulesetOptions = computed(() => (rulesets.value ?? []).map(ruleset => ({
    value: ruleset.uuid, label: ruleset.name
  })))

  return {
    schema, statusOptions, rulesetOptions
  }
}
