// test\unit\utils\settings\featureSegments.test.ts
import { describe, expect, it } from 'vitest'
import { featureSegments } from '~/utils/settings/featureSegments'

describe('featureSegments', () => {
  it('keeps a plain text as one segment', () => {
    expect(featureSegments('Vedere i tornei')).toEqual([
      { kind: 'text', value: 'Vedere i tornei' }
    ])
  })

  it('gives nothing for an empty text', () => {
    expect(featureSegments('')).toEqual([])
  })

  it('marks the **bold** words and keeps the text around them', () => {
    expect(featureSegments('**Creare**, **modificare** tornei')).toEqual([
      { kind: 'strong', value: 'Creare' },
      { kind: 'text', value: ', ' },
      { kind: 'strong', value: 'modificare' },
      { kind: 'text', value: ' tornei' }
    ])
  })

  it('marks a route after an opening parenthesis', () => {
    expect(featureSegments('Gestire i soci (/associates)')).toEqual([
      { kind: 'text', value: 'Gestire i soci (' },
      { kind: 'code', value: '/associates' },
      { kind: 'text', value: ')' }
    ])
  })

  it('marks a route at the start of the text, with nested segments', () => {
    expect(featureSegments('/settings/permissions')).toEqual([
      { kind: 'code', value: '/settings/permissions' }
    ])
  })

  it('marks a route after a space', () => {
    expect(featureSegments('Aprire /finance')).toEqual([
      { kind: 'text', value: 'Aprire ' },
      { kind: 'code', value: '/finance' }
    ])
  })

  it('leaves a slash inside a word as plain text', () => {
    expect(featureSegments('Assegnare/modificare i ruoli')).toEqual([
      { kind: 'text', value: 'Assegnare/modificare i ruoli' }
    ])
  })

  it('does not take a lone slash for a route', () => {
    expect(featureSegments('a / b')).toEqual([{ kind: 'text', value: 'a / b' }])
  })

  it('reads a route and a bold word in the same text, in order', () => {
    expect(featureSegments('**Gestire** i soci (/associates)').map(segment => segment.kind))
      .toEqual(['strong', 'text', 'code', 'text'])
  })
})
