// server\utils\telegram\commands\classifiche.ts
import { InlineKeyboard } from 'grammy'
import type { Bot } from 'grammy'
import { groupBestNByPlayer, toBestNPlacement } from '#shared/utils/cittadino/bestNStandings'

type StandingsFormat = 'pauper' | 'commander' | 'premodern'

const FORMAT_LABELS: Record<StandingsFormat, string> = {
  pauper: 'Pauper',
  commander: 'Commander',
  premodern: 'Premodern'
}

// Same per-rank point scale as useFormatStandingsQuery.ts — duplicated here
// because that composable is Vue-only (useAsyncData/computed) and can't run
// in a Telegram command handler. Only the pure grouping step
// (groupBestNByPlayer/toBestNPlacement, shared/utils/cittadino/bestNStandings.ts)
// is actually shared between the two; the totals/sort step below is small
// enough to duplicate rather than force an abstraction onto the composable.
const POINTS_BY_RANK = [25, 18, 15, 12, 10, 8, 6, 4, 2]
const MIN_POINTS = 1

function pointsForRank(rank: number): number {
  return POINTS_BY_RANK[rank - 1] ?? MIN_POINTS
}

interface FormatStandingsPayload {
  countedResults: number
  participationPoints: number
  results: { player_uuid: string, player_name: string, event_uuid: string, rank: number }[]
}

// Telegram messages cap at 4096 chars — plenty of headroom below that, but a
// full 40+ player table isn't useful to read in a chat bubble either.
const TOP_ROWS = 10

async function formatStandingsMessage(format: StandingsFormat): Promise<string> {
  const payload = await $fetch<FormatStandingsPayload>(`/api/standings/${format}`)

  const placements = payload.results.map(toBestNPlacement)
  const groups = groupBestNByPlayer(
    placements, pointsForRank, payload.countedResults,
    () => ({ participationPoints: payload.participationPoints })
  )

  const rows = groups.map((group) => {
    // fallow-ignore-next-line code-duplication -- same totals logic in useFormatStandingsQuery.ts, see this file's own top comment for why it's duplicated instead of shared
    const counted = group.sortedByPoints.slice(0, payload.countedResults)
    const placementTotal = counted.reduce((sum, result) => sum + result.points, 0)
    const participationTotal = group.results.reduce(
      (sum, result) => sum + result.participationPoints, 0
    )
    return { playerName: group.playerName, total: placementTotal + participationTotal }
  })

  rows.sort((a, b) => b.total - a.total)

  const lines = rows
    .slice(0, TOP_ROWS)
    .map((row, index) => `${index + 1}. ${row.playerName} — ${row.total} pt`)

  return `🏆 *Classifica ${FORMAT_LABELS[format]}*\n\n${lines.join('\n')}`
}

function formatsKeyboard(siteUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(FORMAT_LABELS.pauper, 'classifiche:pauper')
    .text(FORMAT_LABELS.commander, 'classifiche:commander').row()
    .text(FORMAT_LABELS.premodern, 'classifiche:premodern')
    .text('Cittadino', 'classifiche:cittadino').row()
    .url('Apri tutte le classifiche', `${siteUrl}/classifiche`)
}

export function registerClassificheCommand(bot: Bot) {
  bot.command('classifiche', (ctx) => {
    const siteUrl = useRuntimeConfig().public.siteUrl
    return ctx.reply(
      `Scegli un formato, oppure apri la pagina completa: ${siteUrl}/classifiche`,
      { reply_markup: formatsKeyboard(siteUrl) }
    )
  })

  bot.callbackQuery(/^classifiche:(pauper|commander|premodern)$/, async (ctx) => {
    const format = ctx.match[1] as StandingsFormat
    await ctx.answerCallbackQuery()

    const siteUrl = useRuntimeConfig().public.siteUrl
    const message = await formatStandingsMessage(format)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .url('Apri pagina completa', `${siteUrl}/classifiche/${format}`)
        .row()
        .text('« Formati', 'classifiche:menu')
    })
  })

  // Cittadino uses a different scoring model entirely (best-11 across every
  // format, with its own tie-breaks — see ADR-012, docs/PROGRESS.md), not
  // groupBestNByPlayer's plain best-N-of-one-format math above. Rendering it
  // in-chat would mean re-deriving that logic here too; not worth it before
  // the underlying data is real (issue #2) — link out instead.
  bot.callbackQuery('classifiche:cittadino', async (ctx) => {
    await ctx.answerCallbackQuery()
    const siteUrl = useRuntimeConfig().public.siteUrl

    await ctx.editMessageText(
      'La classifica Cittadino usa un calcolo diverso (miglior 11 su tutti i formati) — per ora è disponibile solo sulla pagina pubblica.',
      {
        reply_markup: new InlineKeyboard()
          .url('Apri classifica Cittadino', `${siteUrl}/classifiche/cittadino`)
          .row()
          .text('« Formati', 'classifiche:menu')
      }
    )
  })

  bot.callbackQuery('classifiche:menu', async (ctx) => {
    await ctx.answerCallbackQuery()
    const siteUrl = useRuntimeConfig().public.siteUrl
    await ctx.editMessageText(
      `Scegli un formato, oppure apri la pagina completa: ${siteUrl}/classifiche`,
      { reply_markup: formatsKeyboard(siteUrl) }
    )
  })
}
