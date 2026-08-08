// changelog.config.ts
import type { ChangelogConfig } from 'changelogen'

// changelogen has no top-level "no emoji" flag — type titles carry their emoji
// inline, so disabling it means overriding every title (ADR-010, docs/PROGRESS.md).
// This drives the root CHANGELOG.md (auto-generated, complete raw index) — the
// curated docs/CHANGELOG.md stays hand-written and is not affected by this config.
export default {
  types: {
    feat: { title: 'Enhancements', semver: 'minor' },
    perf: { title: 'Performance', semver: 'patch' },
    fix: { title: 'Fixes', semver: 'patch' },
    refactor: { title: 'Refactors', semver: 'patch' },
    docs: { title: 'Documentation', semver: 'patch' },
    build: { title: 'Build', semver: 'patch' },
    types: { title: 'Types', semver: 'patch' },
    chore: { title: 'Chore' },
    examples: { title: 'Examples' },
    test: { title: 'Tests' },
    style: { title: 'Styles' },
    ci: { title: 'CI' }
  }
} satisfies Partial<ChangelogConfig>
