// app\utils\query\fetchAllRows.ts
// This project's PostgREST caps every request at db.max_rows (1000, raised
// from 250 on 2026-08-29 — see CLAUDE.md's own note on why raising the cap
// only moves the cliff further out, it doesn't remove the need for this)
// regardless of an explicit .range() width — a plain unranged select
// silently truncates instead of erroring, which hid data once a table
// crossed that threshold (confirmed 2026-08-23 for pauperwave_payments,
// 2026-08-26 for pauperwave_associates/pauperwave_associate_renewals). Pages
// through explicitly so a query always returns everything, regardless of
// table size at call time.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null, error: unknown }>
): Promise<T[]> {
  // Must stay <= db.max_rows: if PostgREST ever truncates a page below this
  // value, the `data.length < pageSize` check below reads that as "last
  // page" and stops early — the exact same silent-truncation bug this
  // function exists to prevent, just one level down. Keep this in sync with
  // db.max_rows if that setting ever changes again.
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
