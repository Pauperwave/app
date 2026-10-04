// server\utils\telegram\commands\tournaments\prossimo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { formatTournamentDateTime, tournamentHeader, statusIcon, stageLabel } from './line'
import { fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { registerMenu, registerBackResolver } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '~~/server/utils/telegram/icons'
import { registerDeepLink } from '../../deepLinks'

interface NextTournamentRow {
  uuid: string
  name: string
  starts_at: string | null
  status: string
  league_uuid: string | null
  location: { name: string | null } | null
}

async function fetchNextTournament(): Promise<NextTournamentRow | null> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('uuid, name, starts_at, status, league_uuid, location:locations(name)')
    .is('deleted_at', null)
    .in('status', OPEN_TOURNAMENT_STATUSES)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as NextTournamentRow | null
}

// The command handler and prossimoMenu's .dynamic() both run fetchNextTournament in one update:
// memoizing by ctx dedupes it. See perContextCache.ts
const memoize = createPerContextCache<{ row: Promise<NextTournamentRow | null> }>()

function cachedFetchNextTournament(ctx: Context): Promise<NextTournamentRow | null> {
  return memoize(ctx, 'row', () => fetchNextTournament())
}

function nextTournamentMessage(
  row: NextTournamentRow | null, stageNumber: number | null
): FormattedString {
  if (!row || !row.starts_at) return new FormattedString(`${ICONS.dice} Nessun torneo in programma al momento.`)

  const date = formatTournamentDateTime(row.starts_at)
  const header = tournamentHeader(row.status, row.name, stageNumber)
  const location = row.location?.name ? `\n${ICONS.location} ${row.location.name}` : ''

  return fmt`${ICONS.dice} ${FormattedString.b('Prossimo torneo')}\n\n${header}\n${ICONS.date} ${date}${location}\n\n${ICONS.pointDown} Tocca per i dettagli`
}

// Markdown twin of nextTournamentMessage, for the Rich Message reply only: detail.ts's "back"
// button still needs the FormattedString version to edit a plain text message
function nextTournamentMarkdown(row: NextTournamentRow | null, stageNumber: number | null): string {
  if (!row || !row.starts_at) return `${ICONS.dice} Nessun torneo in programma al momento.`

  const date = formatTournamentDateTime(row.starts_at)
  const stage = stageLabel(stageNumber)
  const location = row.location?.name ? `\n\n${ICONS.location} ${row.location.name}` : ''

  // \n\n, not \n: in Rich Message markdown mode a single \n is a soft break (see core.ts)
  return `## ${ICONS.dice} Prossimo torneo\n\n${statusIcon(row.status)} **${row.name}**${stage}\n\n${ICONS.date} ${date}${location}`
}

async function fetchNextTournamentWithStage(
  ctx: Context
): Promise<{ row: NextTournamentRow | null, stageNumber: number | null }> {
  const row = await cachedFetchNextTournament(ctx)
  // Scoped to this tournament's league (or none), see queries.ts
  const stageNumbers = await fetchStageNumbers(row?.league_uuid ? [row.league_uuid] : [])
  return { row, stageNumber: row ? stageNumbers.get(row.uuid) ?? null : null }
}

export async function prossimoText(ctx: Context): Promise<FormattedString> {
  const { row, stageNumber } = await fetchNextTournamentWithStage(ctx)
  return nextTournamentMessage(row, stageNumber)
}

// Rich Message (markdown) twin of prossimoText, registered as the 'p' back-resolver below; separate
// because the two return different Telegram message shapes, not just different formatting
export async function prossimoMarkdown(ctx: Context): Promise<string> {
  const { row, stageNumber } = await fetchNextTournamentWithStage(ctx)
  return nextTournamentMarkdown(row, stageNumber)
}

// Single-button "menu": needed as a real Menu instance to open torneoMenu's detail (a submenu
// press) and as the "back" target from there (see registerBackResolver('p', ...)). autoAnswer:
// false: the button delegates to openTournamentDetail, which answers the callback itself.
// onMenuOutdated: false: see calendario.ts's calendarioMenu.
export const prossimoMenu = new Menu<Context>('p', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const row = await cachedFetchNextTournament(ctx)
  if (!row) return

  range.text(
    { text: `${ICONS.openDetails} Apri dettagli`, payload: `${row.uuid}:p` },
    ctx => openTournamentDetail(ctx, row.uuid, 'p')
  )
})

registerMenu('p', prossimoMenu)

// Rebuilds this view for detail.ts's "back" button (a registry, see calendario.ts)
registerBackResolver('p', async ctx => ({
  payload: '', menu: prossimoMenu, text: { markdown: await prossimoMarkdown(ctx) }
}))

// Extracted for reuse by t.me/<bot>?start=prossimo (deepLinks.ts)
async function prossimoCommandHandler(ctx: Context) {
  try {
    const markdown = await prossimoMarkdown(ctx)
    await ctx.replyWithRichMessage({ markdown }, { reply_markup: prossimoMenu })
  } catch (err) {
    console.error('Failed to handle /prossimo:', err)
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a recuperare il prossimo torneo, riprova più tardi.`
    })
  }
}

registerDeepLink('prossimo', prossimoCommandHandler)

export function registerProssimoCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, see calendario.ts
  prossimoMenu.register(torneoMenu)
  bot.use(prossimoMenu)

  commands.command('prossimo', 'Il prossimo torneo', prossimoCommandHandler)
}
