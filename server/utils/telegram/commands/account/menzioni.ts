// server\utils\telegram\commands\account\menzioni.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { summarizeMentions } from '#shared/utils/players/playerMentions'

import { requireLinkedAssociate } from './linking'
import { buildMentionsMessage } from './mentionsMessage'
import { registerDeepLink } from '../../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

// From tournament_award_winners, one row per tournament won, which already leaves out tournaments
// that aren't completed and test ones. An associate can have more than one player row: their
// mentions add up.
async function fetchMentions(associateUuid: string) {
  const supabase = telegramServiceSupabaseClient()

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid')
    .eq('associate_uuid', associateUuid)
  if (playersError) throw playersError

  const playerUuids = (players ?? []).map(player => player.uuid)
  if (playerUuids.length === 0) return summarizeMentions([])

  const { data: winners, error } = await supabase
    .from('tournament_award_winners')
    .select('award, deck_uuid, commander_1_name, commander_2_name')
    .in('player_uuid', playerUuids)
  if (error) throw error

  return summarizeMentions(winners ?? [])
}

// Extracted for reuse by t.me/<bot>?start=menzioni (deepLinks.ts)
async function menzioniCommandHandler(ctx: Context) {
  try {
    const associateUuid = await requireLinkedAssociate(ctx)
    if (!associateUuid) return

    await ctx.replyWithRichMessage(buildMentionsMessage(await fetchMentions(associateUuid)))
  } catch (err) {
    console.error('/menzioni failed:', err)
    await ctx.reply(`${ICONS.warning} Non sono riuscito a recuperare le tue menzioni, riprova più tardi.`)
  }
}

registerDeepLink('menzioni', menzioniCommandHandler)

export function registerMenzioniCommand(commands: CommandGroup<Context>) {
  commands.command('menzioni', 'Le tue menzioni speciali', menzioniCommandHandler)
}
