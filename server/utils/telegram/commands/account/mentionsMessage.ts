// server\utils\telegram\commands\account\mentionsMessage.ts
import type { InputRichMessage } from 'grammy/types'
import type { VoteMedal, VoteMedals } from '#shared/utils/commanders/voteMedals'
import { ICONS } from '~~/server/utils/telegram/icons'

// Pure part of /menzioni: a player's special mentions, the same four as the "Menzioni speciali"
// block of their page on the site: how often they were the killer or the victim of a kill, and how
// often they were voted master brewer or best player, the last two with the decks that earned them.

export interface PlayerMentions {
  kills: number
  timesKilled: number
  brewVotes: number
  playVotes: number
  medals: VoteMedals
}

// The decks listed under a mention, most decorated first: more than this is a wall of text
const MAX_DECKS_LISTED = 5

function deckLabel(medal: VoteMedal): string {
  const commanders = medal.commander2Name
    ? `${medal.commander1Name} / ${medal.commander2Name}`
    : medal.commander1Name
  return medal.votes > 1 ? `${commanders} ×${medal.votes}` : commanders
}

// "Winota ×2 · Krenko", with how many more were left out; null when no deck earned it
export function decksLine(medals: VoteMedal[]): string | null {
  if (medals.length === 0) return null

  const listed = medals.slice(0, MAX_DECKS_LISTED).map(deckLabel).join(' · ')
  const hidden = medals.length - MAX_DECKS_LISTED
  return hidden > 0 ? `${listed} · e altri ${hidden}` : listed
}

function mentionLine(icon: string, label: string, count: number, decks: VoteMedal[] = []): string {
  const header = `${icon} ${label}: ${count}`
  const list = decksLine(decks)
  return list ? `${header}\n${list}` : header
}

export function buildMentionsMessage(mentions: PlayerMentions): InputRichMessage {
  const hasAny = mentions.kills + mentions.timesKilled + mentions.brewVotes + mentions.playVotes > 0

  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.medal} Le tue menzioni` },
      {
        type: 'paragraph',
        text: [
          mentionLine(ICONS.skull, 'Carnefice', mentions.kills),
          mentionLine(ICONS.victim, 'Vittima', mentions.timesKilled)
        ].join('\n')
      },
      { type: 'paragraph', text: mentionLine(ICONS.card, 'Master brewer', mentions.brewVotes, mentions.medals.brew) },
      { type: 'paragraph', text: mentionLine(ICONS.playVote, 'Player', mentions.playVotes, mentions.medals.play) },
      ...(hasAny
        ? []
        : [{
          type: 'paragraph' as const,
          text: 'Non hai ancora nessuna menzione: arrivano dai tornei Commander, tra uccisioni e voti.'
        }])
    ]
  }
}
