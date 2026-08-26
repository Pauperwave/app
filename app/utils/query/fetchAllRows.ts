// app\utils\query\fetchAllRows.ts
// This project's PostgREST caps every request at 250 rows (db.max_rows)
// regardless of an explicit .range() width — a plain unranged select
// silently truncates to the first/newest 250 rows instead of erroring, which
// hid data once a table crossed that threshold (confirmed 2026-08-23 for
// pauperwave_payments, 2026-08-26 for pauperwave_associates/
// pauperwave_associate_renewals). Pages through explicitly so a query always
// returns everything, regardless of table size at call time.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null, error: unknown }>
): Promise<T[]> {
  const pageSize = 250
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
