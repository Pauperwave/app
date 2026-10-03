// app\utils\query\fetchAllRows.ts
// PostgREST caps every request at db.max_rows (1000), and a plain unranged select silently
// truncates instead of erroring (see CLAUDE.md). Pages through explicitly so a query always returns
// everything, whatever the table size.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null, error: unknown }>
): Promise<T[]> {
  // Must stay <= db.max_rows: if PostgREST truncated a page below this, `data.length < pageSize`
  // would read it as the last page and stop early (the same silent truncation, one level down).
  // Keep in sync with db.max_rows
  const pageSize = 1000
  let allRows: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allRows
}
