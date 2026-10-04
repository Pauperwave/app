// test\unit\server\telegram\matchNotices.test.ts
import { describe, expect, it } from 'vitest'
import {
  confirmedNoticeText,
  disputedNoticeText,
  reportedNoticeText
} from '../../../../server/utils/telegram/commands/tournaments/matchNotices'

describe('the notices to the other player of a 1v1 table', () => {
  it('names who reported the result, with the recipient\'s games first', () => {
    expect(reportedNoticeText('Emanuele Nardi', 2, '2-1'))
      .toBe('Per il match del Round 2 Emanuele Nardi ha inserito 2-1 (i tuoi game per primi). È corretto?')
  })

  it('names who confirmed the result', () => {
    expect(confirmedNoticeText('Aurelio Varchetta', 3, '1-2'))
      .toBe('✅ Aurelio Varchetta ha confermato il risultato del Round 3: 1-2')
  })

  it('names who disputed the result', () => {
    expect(disputedNoticeText('Aurelio Varchetta', 3))
      .toBe('⚠️ Aurelio Varchetta ha contestato il risultato del Round 3: l\'organizzatore lo verificherà.')
  })
})
