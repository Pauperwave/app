// test\unit\utils\query\fetchAllRows.test.ts
import { describe, expect, it, vi } from 'vitest'
import { fetchAllRows } from '~/utils/query/fetchAllRows'

describe('fetchAllRows', () => {
  it('returns all rows from a single short page', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: [1, 2, 3], error: null })
    const rows = await fetchAllRows(fetchPage)
    expect(rows).toEqual([1, 2, 3])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(0, 999)
  })

  it('pages through when a page comes back full-sized', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, i) => i)
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: [1000, 1001], error: null })

    const rows = await fetchAllRows(fetchPage)
    expect(rows).toHaveLength(1002)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it('returns an empty array when the first page is empty', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: [], error: null })
    expect(await fetchAllRows(fetchPage)).toEqual([])
  })

  it('returns an empty array when data is null', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: null, error: null })
    expect(await fetchAllRows(fetchPage)).toEqual([])
  })

  it('throws when a page returns an error', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    await expect(fetchAllRows(fetchPage)).rejects.toThrow('boom')
  })

  it('stops paging as soon as a page comes back short of pageSize', async () => {
    const shortPage = Array.from({ length: 999 }, (_, i) => i)
    const fetchPage = vi.fn().mockResolvedValue({ data: shortPage, error: null })
    const rows = await fetchAllRows(fetchPage)
    expect(rows).toHaveLength(999)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
