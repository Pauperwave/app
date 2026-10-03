// test\unit\utils\telegram\botCommands.test.ts
import { describe, expect, it } from 'vitest'
import italian from '../../../../i18n/locales/it.json'
import {
  TELEGRAM_BOT_COMMAND_GROUPS,
  TELEGRAM_BOT_URL,
  botCommandUrl
} from '../../../../app/utils/telegram/botCommands'

const commands = TELEGRAM_BOT_COMMAND_GROUPS.flatMap(group => group.commands)

describe('botCommandUrl', () => {
  it('opens the command through its own name by default', () => {
    expect(botCommandUrl({ name: 'calendario', requiresLink: false }))
      .toBe(`${TELEGRAM_BOT_URL}?start=calendario`)
  })

  it('opens just the bot for an empty payload', () => {
    expect(botCommandUrl({ name: 'start', requiresLink: false, startPayload: '' }))
      .toBe(TELEGRAM_BOT_URL)
  })

  it('gives no link to a command that acts at once', () => {
    expect(botCommandUrl({ name: 'drop', requiresLink: true, startPayload: null })).toBeNull()
  })
})

describe('the commands catalog', () => {
  it('lists every command once', () => {
    const names = commands.map(command => command.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('links every command except the ones that leave the tournament or unlink the chat', () => {
    const withoutLink = commands.filter(command => botCommandUrl(command) === null)
    expect(withoutLink.map(command => command.name).sort()).toEqual(['drop', 'scollegamento'])
  })

  it('has a description for every command and a title for every group', () => {
    const { items, groups } = italian.telegramBot.commands as {
      items: Record<string, string>
      groups: Record<string, string>
    }
    for (const command of commands) expect(items[command.name], command.name).toBeTruthy()
    for (const group of TELEGRAM_BOT_COMMAND_GROUPS) expect(groups[group.id], group.id).toBeTruthy()
  })
})
