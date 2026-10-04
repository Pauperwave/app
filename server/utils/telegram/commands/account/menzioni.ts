// server\utils\telegram\commands\account\menzioni.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

import { groupVoteMedals } from '#shared/utils/commanders/voteMedals'

import { requireLinkedAssociate } from './linking'
import { buildMentionsMessage, type PlayerMentions } from './mentionsMessage'
import { registerDeepLink } from '../../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

// From the player_stats and player_vote_decks views, which already leave test tournaments out. An
// associate can have more than one player row: their counts add up.
async function fetchMentions(associateUuid: string): Promise<PlayerMentions> {
  const supabase = telegramServiceSupabaseClient()

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('uuid')
    .eq('associate_uuid', associateUuid)
  if (playersError) throw playersError

  const playerUuids = (players ?? []).map(player => player.uuid)
  const mentions: PlayerMentions = {
    kills: 0, timesKilled: 0, brewVotes: 0, playVotes: 0, medals: { brew: [], play: [] }
  }
  if (playerUuids.length === 0) return mentions

  const [stats, votes] = await Promise.all([
    supabase.from('player_stats').select('kills, times_killed, brew_votes_received, play_votes_received')
      .in('player_uuid', playerUuids),
    supabase.from('player_vote_decks')
      .select('deck_uuid, commander_1_name, commander_2_name, vote_type, votes')
      .in('player_uuid', playerUuids)
  ])
  if (stats.error) throw stats.error
  if (votes.error) throw votes.error

  for (const row of stats.data ?? []) {
    mentions.kills += row.kills ?? 0
    mentions.timesKilled += row.times_killed ?? 0
    mentions.brewVotes += row.brew_votes_received ?? 0
    mentions.playVotes += row.play_votes_received ?? 0
  }

  const voteRows = (votes.data ?? []).flatMap(row => (row.deck_uuid && row.commander_1_name
    ? [{
      deckUuid: row.deck_uuid,
      commander1Name: row.commander_1_name,
      commander2Name: row.commander_2_name,
      voteType: row.vote_type ?? '',
      votes: Number(row.votes ?? 0)
    }]
    : []))
  mentions.medals = groupVoteMedals(voteRows)

  return mentions
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
