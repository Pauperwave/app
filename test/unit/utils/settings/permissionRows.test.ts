// test\unit\utils\settings\permissionRows.test.ts
import { describe, expect, it } from 'vitest'
import it_ from '../../../../i18n/locales/it.json'
import { buildPermissionRows } from '~/utils/settings/permissionRows'
import type { PermissionRow } from '~/utils/settings/permissionRows'

function lookup(path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) => (node as Record<string, unknown> | undefined)?.[part], it_
  )
}

const exists = (path: string) => typeof lookup(path) === 'string'

// A translation the Italian file lacks comes back as its own key, like vue-i18n does
const missing: string[] = []
const translate = (path: string) => {
  if (exists(path)) return lookup(path) as string
  missing.push(path)
  return path
}

// A status note is optional by design (checked with te()); every other key a row names must exist
const optional = (path: string) => (path.endsWith('.statusNote') ? exists(path) : true)
const rows = buildPermissionRows(translate, optional)
const realRows = rows.filter(row => !row.isSection)
const sections = rows.filter(row => row.isSection)

describe('buildPermissionRows', () => {
  it('translates every group, feature and note it mentions', () => {
    expect(missing).toEqual([])
  })

  it('opens every group with its section row', () => {
    const seen = new Set<string>()
    for (const row of rows) {
      if (row.isSection) {
        seen.add(row.group)
      } else {
        expect(seen.has(row.group), `${row.feature} comes before its section`).toBe(true)
      }
    }
  })

  it('has one section per group, none empty', () => {
    expect(new Set(sections.map(row => row.group)).size).toBe(sections.length)
    for (const section of sections) {
      expect(realRows.some(row => row.group === section.group)).toBe(true)
    }
  })

  it('keeps the rows of a group next to each other', () => {
    const order = rows.map(row => row.group)
    const firstOf = (group: string) => order.indexOf(group as never)
    const lastOf = (group: string) => order.lastIndexOf(group as never)
    for (const section of sections) {
      const span = order.slice(firstOf(section.group), lastOf(section.group) + 1)
      expect(span.every(group => group === section.group)).toBe(true)
    }
  })

  it('leaves a section row blank except for its title', () => {
    for (const section of sections) {
      expect(section.status).toBeUndefined()
      expect(section.player).toBeUndefined()
      expect(section.publicAccess).toBeUndefined()
    }
  })

  it('gives every real row a status and the four roles', () => {
    for (const row of realRows) {
      expect(row.status, row.feature).toBeDefined()
      for (const role of ['player', 'organizer', 'admin', 'superAdmin'] as const) {
        expect(row[role], `${row.feature}: ${role}`).toBeDefined()
      }
    }
  })

  it('has no public access unless a row says so', () => {
    const publicRows = realRows.filter(row => row.publicAccess?.access !== 'none')

    expect(publicRows.map(row => row.group).sort()).toEqual(['standings', 'tournaments'])
  })

  it('never gives a lower role more than a higher one', () => {
    const rank = { none: 0, partial: 1, full: 2 } as const
    const roles = ['player', 'organizer', 'admin', 'superAdmin'] as const
    for (const row of realRows) {
      for (let index = 1; index < roles.length; index++) {
        const lower = row[roles[index - 1]!]!.access
        const higher = row[roles[index]!]!.access
        expect(rank[higher], `${row.feature}: ${roles[index]} below ${roles[index - 1]}`)
          .toBeGreaterThanOrEqual(rank[lower])
      }
    }
  })

  it('drops a note whose translation does not exist, and a status note too', () => {
    const noKeys = buildPermissionRows(translate, () => false)
    const withNotes = (list: PermissionRow[]) => list.filter(row =>
      row.statusNote || row.player?.note || row.admin?.note || row.publicAccess?.note)

    expect(withNotes(noKeys)).toEqual([])
    expect(withNotes(rows).length).toBeGreaterThan(0)
  })
})
