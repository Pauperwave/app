// server\utils\telegram\commands\classifiche.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { answerLoadError } from './callbackErrors'

import { groupBestNByPlayer, toBestNPlacement } from '#shared/utils/cittadino/bestNStandings'

type StandingsFormat = 'pauper' | 'commander' | 'premodern'
type StandingsScope = StandingsFormat | 'cittadino'

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

interface CittadinoPayload {
  results: { player_uuid: string, player_name: string, event_uuid: string, rank: number }[]
}

// Same scale as POINTS_BY_RANK above (per-rank points, same regulation
// shape) but Cittadino has its own counted-results cutoff and its own
// tie-breaks (best single result, then events played) — see
// useCittadinoFilters.ts, which this mirrors for the same Vue-only-composable
// reason as formatStandingsMessage above.
const CITTADINO_COUNTED_RESULTS = 11

// Telegram messages cap at 4096 chars — plenty of headroom below that, but a
// full 40+ player table isn't useful to read in a chat bubble either.
const TOP_ROWS = 10

async function formatStandingsMessage(format: StandingsFormat): Promise<FormattedString> {
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

  return fmt`🏆 ${FormattedString.b(`Classifica ${FORMAT_LABELS[format]}`)}\n\n${FormattedString.join(lines, '\n')}`
}

// fallow-ignore-next-line code-duplication -- rows.map/sort/lines block below mirrors formatStandingsMessage's, but the tie-break chain (bestSingle, eventsPlayed) is genuinely different math, not the same logic reshaped
async function cittadinoMessage(): Promise<FormattedString> {
  const payload = await $fetch<CittadinoPayload>('/api/cittadino')

  const placements = payload.results.map(toBestNPlacement)
  const groups = groupBestNByPlayer(placements, pointsForRank, CITTADINO_COUNTED_RESULTS)

  const rows = groups.map((group) => {
    const counted = group.sortedByPoints.slice(0, CITTADINO_COUNTED_RESULTS)
    return {
      playerName: group.playerName,
      total: counted.reduce((sum, result) => sum + result.points, 0),
      bestSingle: group.sortedByPoints[0]?.points ?? 0,
      eventsPlayed: group.results.length
    }
  })

  // Same tie-break order as useCittadinoFilters.ts: total, then best single
  // result, then events played.
  rows.sort((a, b) =>
    b.total - a.total || b.bestSingle - a.bestSingle || b.eventsPlayed - a.eventsPlayed
  )

  const lines = rows
    .slice(0, TOP_ROWS)
    .map((row, index) => `${index + 1}. ${row.playerName} — ${row.total} pt`)

  return fmt`🏆 ${FormattedString.b('Classifica Cittadino')}\n\n${FormattedString.join(lines, '\n')}`
}

function initialMessage(siteUrl: string): string {
  return `Scegli un formato, oppure apri la pagina completa: ${siteUrl}/classifiche`
}

// Submenu reached from every format/Cittadino button on classificheMenu below
// — the button's own payload (the scope) becomes ctx.match here too, read
// fresh on every render since a menu re-renders itself in response to the
// exact callback_query that navigated into it.
// onMenuOutdated: false — see calendario.ts's calendarioMenu for why every
// menu in this bot disables the plugin's built-in staleness fingerprint.
const classificaMenu = new Menu<Context>('classifica-menu', { onMenuOutdated: false }).dynamic((ctx, range) => {
  const scope = ctx.match as StandingsScope | undefined
  if (!scope) return

  const siteUrl = useRuntimeConfig().public.siteUrl
  range.url('Apri pagina completa', `${siteUrl}/classifiche/${scope}`).row()
  // back() only swaps the keyboard back to classificheMenu's — the message
  // text is still whatever showStandings() last set it to, so this restores
  // the original picker text too, same as the old classifiche:menu callback.
  // payload: scope (not omitted) — a payload-less button renders as "" and
  // grammY only assigns a non-empty payload to ctx.match, so ctx.match would
  // stay unset on press; this dynamic() then hits its own `if (!scope)
  // return` guard above and re-renders zero buttons, crashing the plugin's
  // own row/col lookup with no visible error. Confirmed 2026-09-06 ("«
  // Formati" doing nothing on tap after picking a format).
  range.back({ text: '« Formati', payload: scope }, ctx => ctx.editMessageText(initialMessage(useRuntimeConfig().public.siteUrl)))
})

async function showStandings(ctx: Context & { match: string }) {
  try {
    const scope = ctx.match as StandingsScope
    const message = scope === 'cittadino' ? await cittadinoMessage() : await formatStandingsMessage(scope)
    await ctx.editMessageText(message.text, { entities: message.entities })
  } catch {
    await answerLoadError(ctx)
  }
}

// onMenuOutdated: false — see calendario.ts's calendarioMenu for why every
// menu in this bot disables the plugin's built-in staleness fingerprint.
const classificheMenu = new Menu<Context>('classifiche-menu', { onMenuOutdated: false })
  .submenu({ text: FORMAT_LABELS.pauper, payload: 'pauper' satisfies StandingsScope }, 'classifica-menu', showStandings)
  .submenu({ text: FORMAT_LABELS.commander, payload: 'commander' satisfies StandingsScope }, 'classifica-menu', showStandings)
  .row()
  .submenu({ text: FORMAT_LABELS.premodern, payload: 'premodern' satisfies StandingsScope }, 'classifica-menu', showStandings)
  .submenu({ text: 'Cittadino', payload: 'cittadino' satisfies StandingsScope }, 'classifica-menu', showStandings)
  .row()
  .dynamic((_ctx, range) => {
    const siteUrl = useRuntimeConfig().public.siteUrl
    range.url('Apri tutte le classifiche', `${siteUrl}/classifiche`)
  })

classificheMenu.register(classificaMenu)

export function registerClassificheCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(classificheMenu)

  commands.command('classifiche', 'Classifiche per formato', (ctx) => {
    const siteUrl = useRuntimeConfig().public.siteUrl
    return ctx.reply(initialMessage(siteUrl), { reply_markup: classificheMenu })
  })
}
