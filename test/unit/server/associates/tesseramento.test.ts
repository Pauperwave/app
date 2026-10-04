// test\unit\server\associates\tesseramento.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import applyHandler from '../../../../server/api/associates/apply.post'
import renewHandler from '../../../../server/api/associates/renew.post'
import statusHandler from '../../../../server/api/associates/tesseramento-status.get'
import { createFakeSupabase, fakeCreateError, opsNamed } from '../fakeSupabase'
import type { RecordedCall } from '../fakeSupabase'

// The handlers are wrapped at import time: Nitro's auto-imported defineEventHandler must exist first
vi.hoisted(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
})

type Respond = (call: RecordedCall) => { data?: unknown, error: { message: string } | null }

let respond: Respond = () => ({ error: null })
let fake = createFakeSupabase(call => respond(call))

vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: () => fake.client }))

const requireUser = vi.fn()
const requireUserEmail = vi.fn()
const readBody = vi.fn()
const recordMembershipEvent = vi.fn()
const notifyTelegramAdmins = vi.fn()

function setResponse(next: Respond) {
  respond = next
  fake = createFakeSupabase(call => respond(call))
}

beforeEach(() => {
  setResponse(() => ({ error: null }))
  const mocks = [
    requireUser, requireUserEmail, readBody, recordMembershipEvent, notifyTelegramAdmins
  ]
  for (const mock of mocks) mock.mockReset()

  vi.stubGlobal('createError', fakeCreateError)
  vi.stubGlobal('requireUser', requireUser)
  vi.stubGlobal('requireUserEmail', requireUserEmail)
  vi.stubGlobal('readBody', readBody)
  vi.stubGlobal('recordMembershipEvent', recordMembershipEvent)
  vi.stubGlobal('notifyTelegramAdmins', notifyTelegramAdmins)
})

afterEach(() => {
  for (const name of [
    'createError', 'requireUser', 'requireUserEmail', 'readBody', 'recordMembershipEvent',
    'notifyTelegramAdmins'
  ]) {
    vi.stubGlobal(name, undefined)
  }
})

const event = { id: 'event' }
const run = (handler: unknown) => (handler as (event: unknown) => Promise<unknown>)(event)

describe('tesseramento-status', () => {
  it('says "new" for an email nobody has used', async () => {
    requireUserEmail.mockResolvedValue('new@example.com')
    setResponse(() => ({ data: null, error: null }))

    expect(await run(statusHandler)).toEqual({ kind: 'new' })
    expect(opsNamed(fake.calls[0], 'eq')).toEqual([['email_address', 'new@example.com']])
  })

  it('offers an approved associate a one-click renewal, with the name to greet', async () => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({
      data: { first_name: 'Ada', last_name: 'Lovelace', membership_request_status: 'approved' },
      error: null
    }))

    expect(await run(statusHandler)).toEqual({
      kind: 'renewal', firstName: 'Ada', lastName: 'Lovelace'
    })
  })

  it.each(['pending', 'rejected'])('blocks an associate whose request is %s', async (status) => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({
      data: { first_name: 'Ada', last_name: 'Lovelace', membership_request_status: status },
      error: null
    }))

    expect(await run(statusHandler)).toEqual({ kind: 'blocked' })
  })

  it('does not look anything up without a verified session', async () => {
    requireUserEmail.mockRejectedValue(new Error('unauthorized'))

    await expect(run(statusHandler)).rejects.toThrow('unauthorized')
    expect(fake.calls).toHaveLength(0)
  })
})

describe('renew', () => {
  const associate = { uuid: 'u-1', first_name: 'Ada', last_name: 'Lovelace' }

  it('looks up only an approved associate by the session email', async () => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({ data: associate, error: null }))

    await run(renewHandler)

    expect(opsNamed(fake.calls[0], 'eq')).toEqual([
      ['email_address', 'a@example.com'],
      ['membership_request_status', 'approved']
    ])
  })

  it('logs the renewal request, tells the admins and returns the associate', async () => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({ data: associate, error: null }))

    expect(await run(renewHandler)).toEqual({ associate })
    expect(recordMembershipEvent).toHaveBeenCalledWith(fake.client, 'u-1', 'renewal_requested')
    expect(notifyTelegramAdmins).toHaveBeenCalledWith(
      event, expect.stringContaining('Ada Lovelace')
    )
  })

  it('does not touch the associate row: renewing never re-enters the new-applicant queue', async () => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({ data: associate, error: null }))

    await run(renewHandler)

    expect(fake.calls).toHaveLength(1)
    expect(opsNamed(fake.calls[0], 'update')).toEqual([])
    expect(opsNamed(fake.calls[0], 'insert')).toEqual([])
  })

  it('answers 404 when there is no approved associate, without logging or notifying', async () => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({ data: null, error: null }))

    await expect(run(renewHandler)).rejects.toMatchObject({ statusCode: 404 })
    expect(recordMembershipEvent).not.toHaveBeenCalled()
    expect(notifyTelegramAdmins).not.toHaveBeenCalled()
  })

  it('answers 404 on a database error too', async () => {
    requireUserEmail.mockResolvedValue('a@example.com')
    setResponse(() => ({ data: null, error: { message: 'boom' } }))

    await expect(run(renewHandler)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('apply', () => {
  const body = { email_address: 'Ada@Example.com', first_name: 'Ada', last_name: 'Lovelace' }
  const created = { uuid: 'u-1', first_name: 'Ada', last_name: 'Lovelace' }

  function signedInAs(email: string | undefined) {
    requireUser.mockResolvedValue({ email })
  }

  it('refuses an email that is not the verified session email', async () => {
    signedInAs('someone@else.com')
    readBody.mockResolvedValue(body)

    await expect(run(applyHandler)).rejects.toMatchObject({ statusCode: 403 })
    expect(fake.calls).toHaveLength(0)
  })

  it('refuses a body without an email', async () => {
    signedInAs('ada@example.com')
    readBody.mockResolvedValue({ first_name: 'Ada' })

    await expect(run(applyHandler)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('refuses when the session itself has no email', async () => {
    signedInAs(undefined)
    readBody.mockResolvedValue(body)

    await expect(run(applyHandler)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('compares the emails ignoring case', async () => {
    signedInAs('ada@example.com')
    readBody.mockResolvedValue(body)
    setResponse(call => ({
      data: opsNamed(call, 'insert').length ? created : null, error: null
    }))

    expect(await run(applyHandler)).toEqual({ associate: created })
  })

  it('answers 409 when a row with this email exists, whatever its status', async () => {
    signedInAs('ada@example.com')
    readBody.mockResolvedValue(body)
    setResponse(() => ({ data: { id: 7 }, error: null }))

    await expect(run(applyHandler)).rejects.toMatchObject({ statusCode: 409 })
    expect(fake.calls).toHaveLength(1)
    expect(recordMembershipEvent).not.toHaveBeenCalled()
  })

  it('inserts the application as pending with the request date, then logs and notifies', async () => {
    signedInAs('ada@example.com')
    readBody.mockResolvedValue(body)
    setResponse(call => ({
      data: opsNamed(call, 'insert').length ? created : null, error: null
    }))

    await run(applyHandler)

    const [inserted] = opsNamed(fake.calls[1], 'insert')[0] as [Record<string, unknown>]
    expect(inserted).toMatchObject({
      ...body, membership_request_status: 'pending'
    })
    expect(typeof inserted.request_date).toBe('string')
    expect(recordMembershipEvent).toHaveBeenCalledWith(fake.client, 'u-1', 'requested')
    expect(notifyTelegramAdmins).toHaveBeenCalledWith(
      event, expect.stringContaining('Ada Lovelace')
    )
  })

  it('answers 500 with the database error when the insert fails', async () => {
    signedInAs('ada@example.com')
    readBody.mockResolvedValue(body)
    setResponse(call => opsNamed(call, 'insert').length
      ? { data: null, error: { message: 'insert failed' } }
      : { data: null, error: null })

    await expect(run(applyHandler)).rejects.toMatchObject({
      statusCode: 500, statusMessage: 'insert failed'
    })
    expect(recordMembershipEvent).not.toHaveBeenCalled()
    expect(notifyTelegramAdmins).not.toHaveBeenCalled()
  })
})
