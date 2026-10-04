// test\unit\server\telegram\tableNames.test.ts
import { describe, expect, it } from 'vitest'
import { tableNames } from '../../../../server/utils/telegram/tableNames'

describe('tableNames', () => {
  it('gives the first names of the two players of a 1v1 table', () => {
    expect(tableNames({ myFirstName: 'Emanuele', opponent: { firstName: 'Aurelio' } }))
      .toEqual({ me: 'Emanuele', opponent: 'Aurelio' })
  })

  it('has none for a table without a single opponent, like a Commander pod', () => {
    expect(tableNames({})).toBeNull()
  })

  it('has none when the player has no table', () => {
    expect(tableNames(null)).toBeNull()
  })

  it('has none when a name is missing, so a label never mixes a name with a generic word', () => {
    expect(tableNames({ myFirstName: 'Emanuele', opponent: { firstName: null } })).toBeNull()
    expect(tableNames({ myFirstName: null, opponent: { firstName: 'Aurelio' } })).toBeNull()
    expect(tableNames({ myFirstName: '', opponent: { firstName: 'Aurelio' } })).toBeNull()
  })
})
