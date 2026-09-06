// server\utils\telegram\commands\prossimo.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { formatTournamentDateTime, tournamentHeader } from './tournament/line'
import { fetchStageNumbers } from './tournament/queries'
import { torneoMenu, openTournamentDetail } from './tournament/detail'
import { registerMenu } from '../menuNav'

interface NextTournamentRow {
  uuid: string
  name: string
  starts_at: string | null
  status: string
  location: { name: string | null } | null
}

const OPEN_STATUSES = ['registration_open', 'in_progress']

async function fetchNextTournament(): Promise<NextTournamentRow | null> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('uuid, name, starts_at, status, location:locations(name)')
    .is('deleted_at', null)
    .in('status', OPEN_STATUSES)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as NextTournamentRow | null
}

function nextTournamentMessage(
  row: NextTournamentRow | null, stageNumber: number | null
): FormattedString {
  if (!row || !row.starts_at) return new FormattedString('🎲 Nessun torneo in programma al momento.')

  const date = formatTournamentDateTime(row.starts_at)
  const header = tournamentHeader(row.status, row.name, stageNumber)
  const location = row.location?.name ? `\n📍 ${row.location.name}` : ''

  return fmt`🎲 ${FormattedString.b('Prossimo torneo')}\n\n${header}\n🗓️ ${date}${location}\n\n👇 Tocca per i dettagli`
}

// Exported so tournament/detail.ts's shared "back" button can rebuild this
// exact view when returning from a detail page opened from here — see
// menuNav.ts's own comment on why this is a (safe, deferred-access)
// circular import.
export async function prossimoText(): Promise<FormattedString> {
  const [row, stageNumbers] = await Promise.all([fetchNextTournament(), fetchStageNumbers()])
  return nextTournamentMessage(row, row ? stageNumbers.get(row.uuid) ?? null : null)
}

// Single-button "menu" — only ever shows the one next tournament, but still
// needs a real Menu instance both to open torneoMenu's detail view (a
// submenu press) and to serve as the "back" target from there (getMenu('p')).
// autoAnswer: false — the button delegates to openTournamentDetail, which
// answers the callback itself. onMenuOutdated: false — see calendario.ts's
// calendarioMenu for why.
export const prossimoMenu = new Menu<Context>('p', { autoAnswer: false, onMenuOutdated: false }).dynamic(async (ctx, range) => {
  const row = await fetchNextTournament()
  if (!row) return

  range.text(
    { text: '👇 Apri dettagli', payload: `${row.uuid}:p` },
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
    const message = await prossimoText()
      .catch(() => new FormattedString('⚠️ Non sono riuscito a recuperare il prossimo torneo, riprova più tardi.'))
    await ctx.reply(message.text, { entities: message.entities, reply_markup: prossimoMenu })
  })
}
