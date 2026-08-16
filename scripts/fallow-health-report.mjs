// scripts\fallow-health-report.mjs
// Human-readable summary of `fallow health` — score/grade + penalty
// breakdown, top refactoring targets, top churn/complexity hotspots, and
// critical-severity complexity findings grouped by file. Written for the
// same reason as fallow-dupes-report.mjs (2026-08-16): avoid hand-rolling a
// throwaway parse script every time this gets checked.
//
// Usage:
//   node scripts/fallow-health-report.mjs                    run fallow health fresh, report to stdout
//   node scripts/fallow-health-report.mjs --min-severity high lower the complexity-findings floor (default critical)
//   node scripts/fallow-health-report.mjs --top 5             limit targets/hotspots lists (default 10)
//   node scripts/fallow-health-report.mjs --json path.json    report from a previously-saved capture
//   node scripts/fallow-health-report.mjs --save path.json    also write the raw JSON capture there

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? fallback : process.argv[index + 1]
}

const minSeverity = argValue('--min-severity', 'critical')
const top = Number(argValue('--top', '10'))
const jsonPath = argValue('--json')
const savePath = argValue('--save')

// fallow exits 1 when it finds issues (the normal case here, not a real
// error) — execSync throws on that, so the JSON has to be pulled off the
// thrown error's own stdout instead of the successful return value.
function runFallowHealth() {
  const command = `npx fallow health --score --hotspots --targets --complexity `
    + `--min-severity ${minSeverity} --format json --quiet`
  const options = { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 * 32 }
  try {
    return execSync(command, options).toString('utf8')
  } catch (err) {
    if (err.stdout) return err.stdout.toString('utf8')
    throw err
  }
}

const raw = jsonPath ? readFileSync(jsonPath, 'utf8') : runFallowHealth()

if (savePath) writeFileSync(savePath, raw)

const d = JSON.parse(raw)

console.log(`score: ${d.health_score.score} (${d.health_score.grade})`)
console.log(`penalties: ${JSON.stringify(d.health_score.penalties)}`)
console.log(`vital signs: avg cyclomatic ${d.vital_signs.avg_cyclomatic}, p90 ${d.vital_signs.p90_cyclomatic}, `
  + `maintainability avg ${d.vital_signs.maintainability_avg}, duplication ${d.vital_signs.duplication_pct}%`)
console.log(`files: ${d.summary.files_analyzed} analyzed, ${d.summary.functions_analyzed} functions, `
  + `${d.summary.functions_above_threshold} above threshold `
  + `(${d.summary.severity_critical_count} critical / ${d.summary.severity_high_count} high / `
  + `${d.summary.severity_moderate_count} moderate)`)

console.log(`\n--- top ${top} refactoring targets (by priority) ---`)
for (const t of d.targets.slice(0, top)) {
  console.log(`${t.priority}  ${t.path}`)
  console.log(`    ${t.recommendation} (${t.category}, effort: ${t.effort}, confidence: ${t.confidence})`)
}

console.log(`\n--- top ${top} hotspots (by score) ---`)
for (const h of d.hotspots.slice(0, top)) {
  console.log(`${h.score}  ${h.path}  (${h.commits} commits, trend: ${h.trend})`)
}

// With 0% test coverage (no tests exist yet in this project), CRAP score
// (complexity * (1 - coverage)^2) pushes nearly every function above the
// "critical" severity floor regardless of how complex it actually is — so
// this list is capped and sorted by cyclomatic complexity, the metric that
// actually reflects "hard to follow", not by count-per-file.
console.log(`\n--- top ${top} ${minSeverity}+ findings (by cyclomatic complexity) ---`)
const worst = [...d.findings].sort((a, b) => b.cyclomatic - a.cyclomatic).slice(0, top)
for (const f of worst) {
  console.log(`${f.path}:${f.line}  cyclomatic ${f.cyclomatic}, cognitive ${f.cognitive}`)
}
console.log(`(${d.findings.length} total ${minSeverity}+ findings — most are CRAP-score artifacts of 0% coverage, not real complexity)`)
