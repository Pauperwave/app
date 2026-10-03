// test\unit\server\telegram\importSummary.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildImportSummary,
  type ImportOutcome
} from '../../../../server/utils/telegram/commands/cards/importSummary'

function outcome(
  status: ImportOutcome['status'],
  name: string,
  extra: Partial<ImportOutcome['entry']> = {}
): ImportOutcome {
  const resolved = status !== 'notFound'

  return {
    entry: {
      line: 1,
      raw: `1 ${name}`,
      quantity: 1,
      name,
      setCode: null,
      collectorNumber: null,
      foil: false,
      ...extra
    },
    status,
    cardName: resolved ? name : null,
    setCode: resolved ? 'm10' : null
  }
}

describe('buildImportSummary', () => {
  it('counts what was added and lists it', () => {
    const text = buildImportSummary([
      outcome('added', 'Erode'),
      outcome('added', 'Stock Up', { quantity: 2, foil: true })
    ], 0)
    expect(text).toContain('Aggiunte 2')
    expect(text).toContain('Erode (M10)')
    expect(text).toContain('Stock Up (M10) ×2 · foil')
  })

  it('reports duplicates and unknown lines in their own sections', () => {
    const text = buildImportSummary([outcome('already', 'Erode'), outcome('notFound', 'Nope')], 0)
    expect(text).toContain('Nessuna carta aggiunta')
    expect(text).toContain('Già nel tuo elenco</b>\nErode')
    expect(text).toContain('Non trovate</b>\n1 Nope')
  })

  it('escapes HTML coming from the pasted text', () => {
    expect(buildImportSummary([outcome('notFound', '<script>')], 0)).toContain('1 &lt;script&gt;')
  })

  it('mentions the lines dropped over the limit', () => {
    expect(buildImportSummary([outcome('added', 'Erode')], 5)).toContain('ignorate 5')
  })

  it('stays under the Telegram message limit on a huge list', () => {
    const many = Array.from({ length: 400 }, (_, index) => outcome('notFound', `Unknown card ${index}`))
    const text = buildImportSummary(many, 0)
    expect(text.length).toBeLessThan(4096)
    expect(text).toContain('…e altre')
  })
})
