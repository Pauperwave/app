// app\utils\tournaments\bracketLevels.ts
// Ported from MagicTheGathering/league's app/utils/bracketLevels.ts (user
// request 2026-09-16: copy the bracket power-level system, adapted to this
// app). Order/values match WotC's official Commander bracket system
// (Exhibition/Core/Upgraded/Optimized/cEDH). Module-scope const — can't
// call useI18n() here, so this stores i18n *keys*, not translated text;
// resolve `t(key)` at the consuming component's own setup().
export type BracketLevel = 1 | 2 | 3 | 4 | 5

export interface BracketLevelDefinition {
  level: BracketLevel
  nameKey: string
  experienceKey: string
  deckBuildingKey: string
}

// Each level's i18n keys follow the fixed `bracket.level${n}.xxx` pattern in
// i18n/locales/it.json, generated rather than hand-typed.
export const BRACKET_LEVELS: readonly BracketLevelDefinition[] = Array.from(
  { length: 5 },
  (_, i) => {
    const level = (i + 1) as BracketLevelDefinition['level']
    return {
      level,
      nameKey: `bracket.level${level}.name`,
      experienceKey: `bracket.level${level}.experience`,
      deckBuildingKey: `bracket.level${level}.deckBuilding`
    }
  }
)

/** Semantic color per bracket (success→info→primary→warning→error), a
 * casual→competitive intensity ramp using this app's existing color tokens. */
export const BRACKET_COLORS: Record<BracketLevel, 'success' | 'info' | 'primary' | 'warning' | 'error'> = {
  1: 'success',
  2: 'info',
  3: 'primary',
  4: 'warning',
  5: 'error'
}
