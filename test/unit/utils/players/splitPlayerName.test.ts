// test\unit\utils\players\splitPlayerName.test.ts
import { describe, expect, it } from 'vitest'
import { splitPlayerName } from '~/utils/players/splitPlayerName'

describe('splitPlayerName', () => {
  it('splits on the last space into first name and surname', () => {
    expect(splitPlayerName('Mario Rossi')).toEqual({ firstName: 'Mario', surname: 'Rossi' })
  })

  it('treats everything before the last space as the first name', () => {
    expect(splitPlayerName('Maria De Luca')).toEqual({ firstName: 'Maria De', surname: 'Luca' })
  })

  it('returns an empty surname when there is no space', () => {
    expect(splitPlayerName('Cher')).toEqual({ firstName: 'Cher', surname: '' })
  })

  it('returns an empty firstName when the label starts with a space', () => {
    expect(splitPlayerName(' Rossi')).toEqual({ firstName: '', surname: 'Rossi' })
  })
})
