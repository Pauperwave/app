// scripts\fallow-dupes-report.mjs
// Human-readable summary of `fallow dupes` clone groups — written after
// several sessions of hand-rolling a throwaway parse script for the same
// JSON shape (2026-08-16). Sorts groups by line count (biggest duplication
// first) and prints each group's fingerprint + every instance's file:line
// range, so a cleanup pass can work top-down without re-parsing the raw
// `fallow dupes --format json` output by hand each time.
//
// Usage:
//   node scripts/fallow-dupes-report.mjs                 run fallow dupes fresh, report to stdout
//   node scripts/fallow-dupes-report.mjs --min-lines 10   hide groups below N lines (default 0)
//   node scripts/fallow-dupes-report.mjs --json path.json report from a previously-saved capture
//   node scripts/fallow-dupes-report.mjs --save path.json also write the raw JSON capture there

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

const minLines = Number(argValue('--min-lines') ?? 0)
const jsonPath = argValue('--json')
const savePath = argValue('--save')

const raw = jsonPath
  ? readFileSync(jsonPath, 'utf8')
  // stdio: ['ignore', 'pipe', 'ignore'] — fallow writes progress/warnings to
  // stderr even with --quiet in some versions; only stdout is the JSON body.
  : execSync('npx fallow dupes --format json --quiet', {
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024 * 32
    }).toString('utf8')

if (savePath) writeFileSync(savePath, raw)

const data = JSON.parse(raw)
const groups = (data.clone_groups ?? [])
  .filter(group => group.line_count >= minLines)
  .sort((a, b) => b.line_count - a.line_count)

console.log(`stats: ${JSON.stringify(data.stats)}`)
console.log(`${groups.length} clone group${groups.length === 1 ? '' : 's'} (>= ${minLines} lines)\n`)

for (const group of groups) {
  console.log(`--- ${group.fingerprint}  ${group.line_count}l / ${group.token_count}tok  (${group.suggested_name ?? 'unnamed'})`)
  for (const instance of group.instances ?? []) {
    console.log(`    ${instance.file}:${instance.start_line}-${instance.end_line}`)
  }
}
