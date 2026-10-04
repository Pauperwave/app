// server\utils\telegram\commands\account\mentionsMessage.ts
import type { InputRichMessage } from 'grammy/types'
import type { MentionDeck, PlayerMentions } from '#shared/utils/players/playerMentions'
import { ICONS } from '~~/server/utils/telegram/icons'

// Pure part of /menzioni: a player's special mentions, the same four as the "Menzioni speciali"
// block of their page on the site: in how many tournaments they came first as the killer, the
// victim, the master brewer and the player, the last two with the decks that earned them.

// The decks listed under a mention, most decorated first: more than this is a wall of text
const MAX_DECKS_LISTED = 5

function deckLabel(deck: MentionDeck): string {
  const commanders = deck.commander2Name
    ? `${deck.commander1Name} / ${deck.commander2Name}`
    : deck.commander1Name
  return deck.mentions > 1 ? `${commanders} ×${deck.mentions}` : commanders
}

// "Winota ×2 · Krenko", with how many more were left out; null when no deck earned it
export function decksLine(decks: MentionDeck[]): string | null {
  if (decks.length === 0) return null

  const listed = decks.slice(0, MAX_DECKS_LISTED).map(deckLabel).join(' · ')
  const hidden = decks.length - MAX_DECKS_LISTED
  return hidden > 0 ? `${listed} · e altri ${hidden}` : listed
}

function mentionLine(
  icon: string,
  label: string,
  count: number,
  decks: MentionDeck[] = []
): string {
  const header = `${icon} ${label}: ${count}`
  const list = decksLine(decks)
  return list ? `${header}\n${list}` : header
}

export function buildMentionsMessage(mentions: PlayerMentions): InputRichMessage {
  const hasAny = mentions.killer + mentions.victim + mentions.brewer + mentions.player > 0

  return {
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.medal} Le tue menzioni` },
      {
        type: 'paragraph',
        text: [
          mentionLine(ICONS.skull, 'Carnefice', mentions.killer),
          mentionLine(ICONS.victim, 'Vittima', mentions.victim)
        ].join('\n')
      },
      { type: 'paragraph', text: mentionLine(ICONS.card, 'Master brewer', mentions.brewer, mentions.brewerDecks) },
      { type: 'paragraph', text: mentionLine(ICONS.playVote, 'Player', mentions.player, mentions.playerDecks) },
      ...(hasAny
        ? []
        : [{
          type: 'paragraph' as const,
          text: 'Nessuna menzione per ora: si ottiene arrivando primo in una classifica a fine torneo Commander.'
        }])
    ]
  }
}
