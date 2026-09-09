// server\utils\telegram\commands\tournaments\prossimo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { formatTournamentDateTime, tournamentHeader, statusIcon, stageLabel } from './line'
import { fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
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

// The command handler and prossimoMenu's own .dynamic() re-render both run
// fetchNextTournament within the same update — memoizing by ctx dedupes it.
// See perContextCache.ts.
const memoize = createPerContextCache<{ row: Promise<NextTournamentRow | null> }>()

function cachedFetchNextTournament(ctx: Context): Promise<NextTournamentRow | null> {
  return memoize(ctx, 'row', () => fetchNextTournament())
}

function nextTournamentMessage(
  row: NextTournamentRow | null, stageNumber: number | null
): FormattedString {
  if (!row || !row.starts_at) return new FormattedString('🎲 Nessun torneo in programma al momento.')

  const date = formatTournamentDateTime(row.starts_at)
  const header = tournamentHeader(row.status, row.name, stageNumber)
  const location = row.location?.name ? `\n📍 ${row.location.name}` : ''

  return fmt`🎲 ${FormattedString.b('Prossimo torneo')}\n\n${header}\n🗓️ ${date}${location}\n\n👇🏻 Tocca per i dettagli`
}

// Markdown twin of nextTournamentMessage, for the Rich Message reply only
// (see prossimoCommandHandler) — kept separate rather than reused, since
// tournament/detail.ts's "back" button still needs the FormattedString
// version above to edit a plain text message, not a rich one.
function nextTournamentMarkdown(row: NextTournamentRow | null, stageNumber: number | null): string {
  if (!row || !row.starts_at) return '🎲 Nessun torneo in programma al momento.'

  const date = formatTournamentDateTime(row.starts_at)
  const stage = stageLabel(stageNumber)
  const location = row.location?.name ? `\n📍 ${row.location.name}` : ''

  return `## 🎲 Prossimo torneo\n\n${statusIcon(row.status)} **${row.name}**${stage}\n🗓️ ${date}${location}`
}

async function fetchNextTournamentWithStage(
  ctx: Context
): Promise<{ row: NextTournamentRow | null, stageNumber: number | null }> {
  const row = await cachedFetchNextTournament(ctx)
  // Scoped to this tournament's own league (or none) — see queries.ts's
  // own comment on why.
  const stageNumbers = await fetchStageNumbers(row?.league_uuid ? [row.league_uuid] : [])
  return { row, stageNumber: row ? stageNumbers.get(row.uuid) ?? null : null }
}

// Exported so tournament/detail.ts's shared "back" button can rebuild this
// exact view when returning from a detail page opened from here — see
// menuNav.ts's own comment on why this is a (safe, deferred-access)
// circular import.
export async function prossimoText(ctx: Context): Promise<FormattedString> {
  const { row, stageNumber } = await fetchNextTournamentWithStage(ctx)
  return nextTournamentMessage(row, stageNumber)
}

// Rich Message (markdown) twin of prossimoText — see tournament/detail.ts's
// resolveBackTarget 'p' branch, the only other caller. Kept as a separate
// exported function (not a flag on prossimoText) since the two return
// different Telegram message shapes, not just different formatting of the
// same one.
export async function prossimoMarkdown(ctx: Context): Promise<string> {
  const { row, stageNumber } = await fetchNextTournamentWithStage(ctx)
  return nextTournamentMarkdown(row, stageNumber)
}

// Single-button "menu" — only ever shows the one next tournament, but still
// needs a real Menu instance both to open torneoMenu's detail view (a
// submenu press) and to serve as the "back" target from there (getMenu('p')).
// autoAnswer: false — the button delegates to openTournamentDetail, which
// answers the callback itself. onMenuOutdated: false — see calendario.ts's
// calendarioMenu for why.
export const prossimoMenu = new Menu<Context>('p', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const row = await cachedFetchNextTournament(ctx)
  if (!row) return

  range.text(
    { text: '👇🏻 Apri dettagli', payload: `${row.uuid}:p` },
    ctx => openTournamentDetail(ctx, row.uuid, 'p')
  )
})

registerMenu('p', prossimoMenu)

// Extracted so it can be reused verbatim by t.me/<bot>?start=prossimo —
// see deepLinks.ts.
async function prossimoCommandHandler(ctx: Context) {
  try {
    const markdown = await prossimoMarkdown(ctx)
    await ctx.replyWithRichMessage({ markdown }, { reply_markup: prossimoMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a recuperare il prossimo torneo, riprova più tardi.'
    })
  }
}

registerDeepLink('prossimo', prossimoCommandHandler)

export function registerProssimoCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time (not module top level) — same circular-import
  // reasoning as calendario.ts's own comment.
  prossimoMenu.register(torneoMenu)
  bot.use(prossimoMenu)

  commands.command('prossimo', 'Il prossimo torneo', prossimoCommandHandler)
}
