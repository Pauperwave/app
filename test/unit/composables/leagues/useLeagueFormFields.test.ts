// test\unit\composables\leagues\useLeagueFormFields.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'
import { useLeagueFormFields } from '~/composables/leagues/useLeagueFormFields'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/rulesets/useRulesetsQuery', () => ({
  useRulesetsQuery: () => ({ data: ref([{ uuid: 'r1', name: 'Regolamento Standard' }]) })
}))

describe('useLeagueFormFields', () => {
  it('requires a non-blank name but not a ruleset', () => {
    const { schema } = useLeagueFormFields()
    expect(v.safeParse(schema, { status: 'draft', name: 'Lega Pauper' }).success).toBe(true)
    expect(v.safeParse(schema, { status: 'draft', name: '' }).success).toBe(false)
    expect(v.safeParse(schema, { status: 'draft', name: '  ' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    const { schema } = useLeagueFormFields()
    const result = v.safeParse(schema, { status: 'archived', name: 'Lega' })
    expect(result.success).toBe(false)
  })

  it('exposes one status option per LEAGUE_STATUSES value', () => {
    const { statusOptions } = useLeagueFormFields()
    expect(statusOptions.value.map(o => o.value)).toEqual(['draft', 'active', 'completed', 'cancelled'])
  })

  it('maps rulesets from the query into select options', () => {
    const { rulesetOptions } = useLeagueFormFields()
    expect(rulesetOptions.value).toEqual([{ value: 'r1', label: 'Regolamento Standard' }])
  })
})
