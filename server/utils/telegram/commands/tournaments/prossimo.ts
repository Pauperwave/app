// server\utils\telegram\commands\tournaments\prossimo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { formatTournamentDateTime, tournamentHeader } from './line'
import { fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'

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

// Exported so tournament/detail.ts's shared "back" button can rebuild this
// exact view when returning from a detail page opened from here — see
// menuNav.ts's own comment on why this is a (safe, deferred-access)
// circular import.
export async function prossimoText(ctx: Context): Promise<FormattedString> {
  const row = await cachedFetchNextTournament(ctx)
  // Scoped to this tournament's own league (or none) — see queries.ts's
  // own comment on why.
  const stageNumbers = await fetchStageNumbers(row?.league_uuid ? [row.league_uuid] : [])
  return nextTournamentMessage(row, row ? stageNumbers.get(row.uuid) ?? null : null)
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

export function registerProssimoCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time (not module top level) — same circular-import
  // reasoning as calendario.ts's own comment.
  prossimoMenu.register(torneoMenu)
  bot.use(prossimoMenu)

  commands.command('prossimo', 'Il prossimo torneo', async (ctx) => {
    const message = await prossimoText(ctx)
      .catch(() => new FormattedString('⚠️ Non sono riuscito a recuperare il prossimo torneo, riprova più tardi.'))
    await ctx.reply(message.text, { entities: message.entities, reply_markup: prossimoMenu })
  })
}
