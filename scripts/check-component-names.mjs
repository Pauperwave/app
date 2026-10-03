// scripts\check-component-names.mjs
// Checks that every component tag used in a .vue template resolves to a component Nuxt registered
// (.nuxt/components.d.ts), or is a builtin or imported in the file. An unknown tag isn't an error
// for Vue: it renders as an empty custom element and only warns in dev, which is how a component
// whose folder adds a prefix (<ScryfallSearchButton> for components/magic/ScryfallSearchButton.vue,
// really <MagicScryfallSearchButton>) goes unnoticed. Run `pnpm typecheck` or `nuxt prepare` first
// so .nuxt/components.d.ts is current.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const COMPONENTS_DTS = join(ROOT, '.nuxt/components.d.ts')

if (!existsSync(COMPONENTS_DTS)) {
  console.error('.nuxt/components.d.ts is missing: run `nuxt prepare` (or `pnpm typecheck`) first.')
  process.exit(2)
}

const registered = new Set(
  [...readFileSync(COMPONENTS_DTS, 'utf8').matchAll(/export const (\w+):/g)].map(match => match[1])
)

const BUILTINS = new Set([
  'Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Component', 'Slot',
  'Template', 'I18nT', 'I18nN', 'I18nD', 'NuxtLink', 'NuxtImg', 'NuxtPicture', 'NuxtPage',
  'NuxtLayout', 'NuxtLoadingIndicator', 'NuxtRouteAnnouncer', 'NuxtErrorBoundary', 'NuxtIsland',
  'ClientOnly', 'DevOnly', 'NuxtTime', 'Head', 'Html', 'Body', 'Title', 'Meta', 'Link', 'Style',
  'Script', 'Base', 'NoScript'
])

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (entry.endsWith('.vue')) files.push(full)
  }
  return files
}

function importedNames(script) {
  const names = new Set()
  for (const match of script.matchAll(/import\s+(?:type\s+)?(\w+)\s+from/g)) names.add(match[1])
  for (const match of script.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from/g)) {
    for (const item of match[1].split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop()
      if (name) names.add(name)
    }
  }
  return names
}

const toPascal = tag => tag.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')

const problems = []
for (const file of walk(join(ROOT, 'app'))) {
  const source = readFileSync(file, 'utf8')
  const template = /^<template>([\s\S]*?)^<\/template>/m.exec(source)
  if (!template) continue

  // Comments blanked, not removed, so the line numbers below stay right
  const markup = template[1]
    .replace(/<!--[\s\S]*?-->/g, comment => comment.replace(/[^\n]/g, ' '))
  const script = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n')
  const imported = importedNames(script)
  const scriptIdentifiers = new Set(script.match(/[A-Za-z_$][\w$]*/g))
  const reported = new Set()

  for (const match of markup.matchAll(/<([A-Za-z][A-Za-z0-9]*(?:-[a-z0-9]+)*)(?=[\s/>])/g)) {
    const tag = match[1]
    const isNativeElement = /^[a-z][a-z0-9]*$/.test(tag)
    if (isNativeElement || reported.has(tag)) continue
    reported.add(tag)

    const name = tag.includes('-') ? toPascal(tag) : tag
    const known = registered.has(name) || registered.has(`Lazy${name}`) || BUILTINS.has(name)
      || imported.has(name) || imported.has(tag)
    if (known || scriptIdentifiers.has(name)) continue

    const line = source.slice(0, template.index + 10 + match.index).split('\n').length
    problems.push(`${file.slice(ROOT.length + 1)}:${line}  <${tag}>`)
  }
}

if (problems.length) {
  console.error('Component tags that resolve to nothing (they render as empty elements):')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log('Every component tag in the templates resolves.')
