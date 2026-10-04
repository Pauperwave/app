// test\unit\shared\telegram\tournamentLink.test.ts
import { describe, expect, it } from 'vitest'
import {
  TOURNAMENT_LINK_PREFIX,
  isTournamentUuid,
  parseTournamentLinkPayload,
  tournamentLinkPayload
} from '../../../../shared/utils/telegram/tournamentLink'

const UUID = '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'

describe('tournamentLinkPayload', () => {
  it('is the prefix and the uuid', () => {
    expect(tournamentLinkPayload(UUID)).toBe(`torneo_${UUID}`)
  })

  it('fits Telegram\'s limits for a start payload', () => {
    const payload = tournamentLinkPayload(UUID)
    expect(payload.length).toBeLessThanOrEqual(64)
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('parseTournamentLinkPayload', () => {
  it('gives back the uuid it was built from', () => {
    expect(parseTournamentLinkPayload(tournamentLinkPayload(UUID))).toBe(UUID)
  })

  it('lowercases an uppercase uuid', () => {
    expect(parseTournamentLinkPayload(`${TOURNAMENT_LINK_PREFIX}${UUID.toUpperCase()}`)).toBe(UUID)
  })

  it.each([
    ['another prefix', `help_${UUID}`],
    ['no uuid', 'torneo_'],
    ['a malformed uuid', 'torneo_not-a-uuid'],
    ['a uuid with something after it', `torneo_${UUID}x`],
    ['the bare uuid', UUID],
    ['an empty payload', '']
  ])('rejects %s', (_label, payload) => {
    expect(parseTournamentLinkPayload(payload)).toBeNull()
  })
})

describe('isTournamentUuid', () => {
  it('only accepts a well-formed uuid', () => {
    expect(isTournamentUuid(UUID)).toBe(true)
    expect(isTournamentUuid('0b6b4d3a')).toBe(false)
    expect(isTournamentUuid('')).toBe(false)
  })
})
