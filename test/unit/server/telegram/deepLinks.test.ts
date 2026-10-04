// test\unit\server\telegram\deepLinks.test.ts
import type { Context } from 'grammy'
import { describe, expect, it } from 'vitest'
import {
  registerDeepLink,
  registerDeepLinkPrefix,
  resolveDeepLink
} from '../../../../server/utils/telegram/deepLinks'

const ctx = {} as Context

describe('resolveDeepLink', () => {
  it('finds an exact payload', async () => {
    let called = false
    registerDeepLink('exacttest', async () => {
      called = true
    })

    await resolveDeepLink('exacttest')?.(ctx)
    expect(called).toBe(true)
  })

  it('hands the rest of the payload to a prefix handler', async () => {
    const received: string[] = []
    registerDeepLinkPrefix('argtest_', async (_ctx, argument) => {
      received.push(argument)
    })

    await resolveDeepLink('argtest_abc-123')?.(ctx)
    expect(received).toEqual(['abc-123'])
  })

  it('prefers an exact payload over a prefix that also matches', async () => {
    const calls: string[] = []
    registerDeepLinkPrefix('both_', async () => {
      calls.push('prefix')
    })
    registerDeepLink('both_exact', async () => {
      calls.push('exact')
    })

    await resolveDeepLink('both_exact')?.(ctx)
    expect(calls).toEqual(['exact'])
  })

  it('knows nothing about an unregistered payload', () => {
    expect(resolveDeepLink('nothing-registered-here')).toBeUndefined()
  })
})
