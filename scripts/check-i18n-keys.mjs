// scripts\check-i18n-keys.mjs
// Ad hoc audit (not in package.json): checks every literal t('...')/$t('...') key in app/ and
// server/ resolves against i18n/locales/it.json.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()
const LOCALE_PATH = join(ROOT, 'i18n/locales/it.json')
const SCAN_DIRS = ['app', 'server', 'shared']
const EXTENSIONS = new Set(['.vue', '.ts'])

function flattenKeys(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, fullKey, out)
    } else {
      out.add(fullKey)
    }
  }
  return out
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.nuxt' || entry === '.output') continue
      walk(full, files)
    } else if (EXTENSIONS.has(extname(full))) {
      files.push(full)
    }
  }
  return files
}

const locale = JSON.parse(readFileSync(LOCALE_PATH, 'utf8'))
const definedKeys = flattenKeys(locale)

// Literal-key calls only; template-literal/variable keys can't be resolved statically
const CALL_PATTERN = /\$?\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g

const missing = new Map()

for (const dir of SCAN_DIRS) {
  const fullDir = join(ROOT, dir)
  let files
  try {
    files = walk(fullDir)
  } catch {
    continue
  }
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    let match
    while ((match = CALL_PATTERN.exec(content)) !== null) {
      const key = match[1]
      if (!definedKeys.has(key)) {
        const relFile = file.slice(ROOT.length + 1)
        if (!missing.has(key)) missing.set(key, new Set())
        missing.get(key).add(relFile)
      }
    }
  }
}

if (missing.size === 0) {
  console.log('No missing i18n keys found (among statically-resolvable t()/$t() calls).')
} else {
  console.log(`${missing.size} missing i18n key(s):\n`)
  for (const [key, files] of [...missing.entries()].sort()) {
    console.log(`  ${key}`)
    for (const file of files) console.log(`    - ${file}`)
  }
}
