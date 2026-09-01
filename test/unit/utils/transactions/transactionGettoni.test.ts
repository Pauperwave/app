// test\unit\utils\transactions\transactionGettoni.test.ts
import { describe, expect, it } from 'vitest'
import { parseGettoniCount } from '~/utils/transactions/transactionGettoni'

describe('parseGettoniCount', () => {
  it.each([
    ['3 gettoni', 3],
    ['1 gettone', 1],
    ['  10 GETTONI  ', 10],
    ['Commanderwave Fest', null],
    [null, null],
    ['', null]
  ])('%s -> %s', (eventName, expected) => {
    expect(parseGettoniCount(eventName)).toBe(expected)
  })
})
