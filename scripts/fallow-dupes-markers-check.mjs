// scripts\fallow-dupes-markers-check.mjs
// fallow only honors a `fallow-ignore-next-line` marker that
// is a single comment line directly above the flagged code; a split or separated marker silently
// fails. This script catches that shape.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// fallow-ignore-next-line security-sink -- this script's own location, no external input
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const files = execSync('git grep -l "fallow-ignore-next-line"', { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

const broken = []
for (const file of files) {
  // fallow-ignore-next-line security-sink -- `file` is a path git grep printed for this repo
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const markerLine = lines[i].trim()
    const isHtmlComment = markerLine.startsWith('<!--')
    const isJsComment = markerLine.startsWith('//')

    // The keyword must open the comment, not just appear in prose (this file's header would
    // false-positive)
    const content = markerLine
      .replace(/^<!--\s*/, '')
      .replace(/\s*-->$/, '')
      .replace(/^\/\/\s*/, '')
    if (!content.startsWith('fallow-ignore-next-line')) continue

    const closesOnSameLine = isHtmlComment && markerLine.includes('-->')

    if (isJsComment && (lines[i + 1] ?? '').trim().startsWith('//')) {
      broken.push(`${file}:${i + 1}`)
    } else if (isHtmlComment && !closesOnSameLine) {
      broken.push(`${file}:${i + 1}`)
    }
  }
}

if (broken.length) {
  console.error('fallow-ignore-next-line markers that will NOT suppress (must be one physical line, directly above the flagged code):')
  for (const entry of broken) console.error(`  ${entry}`)
  process.exit(1)
}

console.log('All fallow-ignore-next-line markers are single-line and correctly placed.')
