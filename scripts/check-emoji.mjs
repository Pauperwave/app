// scripts\check-emoji.mjs
// Checks that no emoji is written inline in the server code: every emoji in a bot message, button
// label or toast comes from server/utils/telegram/icons.ts (`${ICONS.success} Fatto`, never
// '✅ Fatto'). Comment lines are ignored, and so is icons.ts itself.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SCANNED_DIR = join(ROOT, 'server')
const ICONS_FILE = join(ROOT, 'server', 'utils', 'telegram', 'icons.ts')

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (entry.endsWith('.ts') && full !== ICONS_FILE) files.push(full)
  }
  return files
}

const findings = []
for (const file of walk(SCANNED_DIR)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (COMMENT_LINE.test(line) || !EMOJI.test(line)) return
    findings.push(`${relative(ROOT, file).split(sep).join('/')}:${index + 1}: ${line.trim()}`)
  })
}

if (findings.length) {
  console.error(`Inline emoji (add it to server/utils/telegram/icons.ts and use ICONS.x):\n`)
  console.error(findings.join('\n'))
  process.exit(1)
}
console.log('No inline emoji in server/.')
