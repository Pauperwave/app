// test\unit\server\fakeSupabase.ts
// A stand-in for the Supabase client in server-util tests: it records every chained call
// (`from(table).update(...).eq(...)`) and answers each query with whatever `respond` returns.
export interface RecordedOp {
  method: string
  args: unknown[]
}

export interface RecordedCall {
  table: string
  ops: RecordedOp[]
}

export interface FakeResult {
  data?: unknown
  count?: number | null
  error: { message: string } | null
}

export function createFakeSupabase(
  respond: (call: RecordedCall) => FakeResult = () => ({ error: null })
) {
  const calls: RecordedCall[] = []

  const client = {
    from(table: string) {
      const call: RecordedCall = { table, ops: [] }
      calls.push(call)

      // Any chained method returns the same builder; awaiting it yields the response.
      const builder: unknown = new Proxy({}, {
        get(_target, property) {
          if (property === 'then') {
            return (resolve: (result: FakeResult) => void) => resolve(respond(call))
          }
          return (...args: unknown[]) => {
            call.ops.push({ method: String(property), args })
            return builder
          }
        }
      })
      return builder
    }
  }

  return { client, calls }
}

export function opsNamed(call: RecordedCall | undefined, method: string): unknown[][] {
  return (call?.ops ?? []).filter(op => op.method === method).map(op => op.args)
}

// What Nitro's auto-imported createError builds: an error carrying the HTTP status.
export function fakeCreateError(input: { statusCode: number, statusMessage: string }) {
  return Object.assign(new Error(input.statusMessage), input)
}
