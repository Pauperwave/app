// test\unit\server\tournaments\definePairingWriteHandler.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definePairingWriteHandler } from '../../../../server/utils/tournaments/definePairingWriteHandler'

const serviceClient = { from: vi.fn() }

vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: () => serviceClient }))

const requireManagementPermission = vi.fn()
const readBody = vi.fn()
const assertPairingEditable = vi.fn()

beforeEach(() => {
  requireManagementPermission.mockReset()
  readBody.mockReset()
  assertPairingEditable.mockReset()

  // Nitro auto-imports: the wrapped handler is the plain async function under test
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('requireManagementPermission', requireManagementPermission)
  vi.stubGlobal('readBody', readBody)
  vi.stubGlobal('assertPairingEditable', assertPairingEditable)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type Body = { pairingUuid: string }
type Write<Result> = Parameters<typeof definePairingWriteHandler<Body, Result>>[0]

async function run<Result>(handle: Write<Result>) {
  const wrapped = definePairingWriteHandler(handle)
  const handler = wrapped as unknown as (event: unknown) => Promise<Result>
  return handler({ id: 'event' })
}

describe('definePairingWriteHandler', () => {
  it('checks permission, then the pairing lock, then runs the write with the body', async () => {
    const order: string[] = []
    requireManagementPermission.mockImplementation(async () => order.push('permission'))
    readBody.mockResolvedValue({ pairingUuid: 'pair-1' })
    assertPairingEditable.mockImplementation(async () => order.push('lock'))

    const result = await run(async ({ supabase, body }) => {
      order.push('write')
      expect(supabase).toBe(serviceClient)
      expect(body).toEqual({ pairingUuid: 'pair-1' })
      return { success: true }
    })

    expect(order).toEqual(['permission', 'lock', 'write'])
    expect(assertPairingEditable).toHaveBeenCalledWith(serviceClient, 'pair-1')
    expect(result).toEqual({ success: true })
  })

  it('does not run the write when the caller lacks permission', async () => {
    requireManagementPermission.mockRejectedValue(new Error('forbidden'))
    const write = vi.fn()

    await expect(run(write)).rejects.toThrow('forbidden')

    expect(readBody).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it('does not run the write when the pairing is locked', async () => {
    readBody.mockResolvedValue({ pairingUuid: 'pair-1' })
    assertPairingEditable.mockRejectedValue(new Error('locked'))
    const write = vi.fn()

    await expect(run(write)).rejects.toThrow('locked')

    expect(write).not.toHaveBeenCalled()
  })
})
