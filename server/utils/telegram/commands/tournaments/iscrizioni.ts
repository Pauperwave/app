// server\utils\telegram\commands\tournaments\iscrizioni.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'

import { formatButtonDate, stageLabel, tournamentButtonLabel } from './line'
import { fetchStageNumbers, OPEN_TOURNAMENT_STATUSES } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { requireLinkedAssociate, resolveAssociateUuidByChatId } from '../account/linking'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '../../icons'
import { registerDeepLink } from '../../deepLinks'

interface MyTournamentRow {
  uuid: string
  name: string
  starts_at: string
  location: { name: string | null } | null
  stageNumber: number | null
}

interface RawTournamentRow {
  uuid: string
  name: string
  starts_at: string
  league_uuid: string | null
  location: { name: string | null } | null
}

interface RegistrationRow {
  status: string
  tournament: RawTournamentRow | null
}

interface MyRegistration {
  registrationStatus: string
  tournament: MyTournamentRow
}

async function fetchMyTournaments(associateUuid: string): Promise<MyRegistration[]> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      status,
      players!inner(associate_uuid),
      tournament:tournaments!inner(uuid, name, starts_at, league_uuid, location:locations(name))
    `)
    .eq('players.associate_uuid', associateUuid)
    .is('tournament.deleted_at', null)
    .in('tournament.status', OPEN_TOURNAMENT_STATUSES)

  if (error) throw error

  const rows = (data as RegistrationRow[])
    .filter((row): row is RegistrationRow & { tournament: RawTournamentRow } =>
      row.tournament !== null && row.tournament.starts_at !== null)

  // Scoped to only the leagues this associate is actually registered in —
  // see queries.ts's own comment on why.
  const leagueUuids = [...new Set(
    rows.map(row => row.tournament.league_uuid).filter(uuid => uuid !== null)
  )]
  const stageNumbers = await fetchStageNumbers(leagueUuids)

  return rows
    .map(row => ({
      registrationStatus: row.status,
      tournament: { ...row.tournament, stageNumber: stageNumbers.get(row.tournament.uuid) ?? null }
    }))
    .sort((a, b) => a.tournament.starts_at.localeCompare(b.tournament.starts_at))
}

// The command handler and iscrizioniMenu's own .dynamic() re-render both
// run fetchMyTournaments within the same update — memoizing by ctx dedupes
// it. See perContextCache.ts.
const memoize = createPerContextCache<{ registrations: Promise<MyRegistration[]> }>()

function cachedFetchMyTournaments(ctx: Context, associateUuid: string): Promise<MyRegistration[]> {
  return memoize(ctx, 'registrations', () => fetchMyTournaments(associateUuid))
}

// Named registrationIcon, not statusIcon — line.ts already exports a
// statusIcon for tournament status, a different meaning entirely.
function registrationIcon(registrationStatus: string): string {
  return registrationStatus === 'checked_in' ? ICONS.registrationCheckedIn : ICONS.registrationRegistered
}

function mieiTorneiMarkdown(registrations: MyRegistration[]): string {
  const header = '## 🎟️ I tuoi tornei'

  if (!registrations.length) {
    return `${header}\n\nNon risulti iscritto a nessun torneo in programma.`
  }

  const blocks = registrations.map(({ registrationStatus, tournament }) => {
    const date = formatTelegramDate(tournament.starts_at, 'EEE d MMM', { locale: it })
    const stage = stageLabel(tournament.stageNumber)

    const tournamentLines = [
      `${registrationIcon(registrationStatus)} **${tournament.name}**${stage}`,
      `🗓️ ${date}`
    ]
    if (tournament.location?.name) tournamentLines.push(`📍 ${tournament.location.name}`)
    // \n\n, not \n — see core.ts's HELP_TEXT comment on Rich Message markdown.
    return tournamentLines.join('\n\n')
  })

  return `${header}\n\n${blocks.join('\n\n')}`
}

// Exported so tournament/detail.ts's "back" button can rebuild this view.
// Falls back to "not linked" for the practically unreachable case of a
// chat that unlinked mid-session.
export async function iscrizioniMarkdown(ctx: Context, chatId: number): Promise<string> {
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return 'Devi prima collegare il tuo account.'

  const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
  return mieiTorneiMarkdown(registrations)
}

// autoAnswer: false — the "open tournament" buttons delegate to
// openTournamentDetail, which answers the callback itself.
// onMenuOutdated: false — see calendario.ts's calendarioMenu for why.
export const iscrizioniMenu = new Menu<Context>('isc', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) return

  const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
  for (const { registrationStatus, tournament } of registrations) {
    const date = formatButtonDate(tournament.starts_at)
    const label = tournamentButtonLabel(
      registrationIcon(registrationStatus), date, tournament.stageNumber, tournament.name
    )
    range.row().text(
      { text: label, payload: `${tournament.uuid}:i` },
      ctx => openTournamentDetail(ctx, tournament.uuid, 'i')
    )
  }
})

registerMenu('isc', iscrizioniMenu)

// Extracted so it can be reused verbatim by t.me/<bot>?start=iscrizioni —
// see deepLinks.ts. A "apri nel bot" button on the web app's own
// registrations page is the intended entry point (2026-09-08).
async function iscrizioniCommandHandler(ctx: Context) {
  try {
    const associateUuid = await requireLinkedAssociate(ctx)
    if (!associateUuid) return

    const registrations = await cachedFetchMyTournaments(ctx, associateUuid)
    const markdown = mieiTorneiMarkdown(registrations)
    await ctx.replyWithRichMessage({ markdown }, { reply_markup: iscrizioniMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: '⚠️ Non sono riuscito a recuperare i tuoi tornei, riprova più tardi.'
    })
  }
}

registerDeepLink('iscrizioni', iscrizioniCommandHandler)

export function registerIscrizioniCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, not module top level — see calendario.ts's own
  // comment on why.
  iscrizioniMenu.register(torneoMenu)
  bot.use(iscrizioniMenu)

  commands.command('iscrizioni', 'I tornei a cui sei iscritto', iscrizioniCommandHandler)
}
