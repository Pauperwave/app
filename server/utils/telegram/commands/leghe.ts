// server\utils\telegram\commands\leghe.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { statusIcon, stageLabel, tournamentLine, tournamentButtonLabel } from './tournament/line'
import { fetchRegistrationStatuses, fetchStageNumbers } from './tournament/queries'
import type { RegistrationStatus } from './tournament/queries'
import { torneoMenu, openTournamentDetail } from './tournament/detail'
import { answerLoadError } from './callbackErrors'
import { registerMenu } from '../menuNav'

import { tournamentProgressByLeague } from '#shared/utils/leagues/tournamentProgressByLeague'
import type { LeagueTournamentRow } from '#shared/utils/leagues/tournamentProgressByLeague'

interface ActiveLeagueRow {
  uuid: string
  name: string
  starts_at: string | null
  ends_at: string | null
}

interface LeagueTournamentDetailRow {
  uuid: string
  name: string
  starts_at: string | null
  status: string
  location: { name: string | null } | null
}

function formatDate(date: string | null): string | null {
  return date ? formatTelegramDate(date, 'd MMM yyyy', { locale: it }) : null
}

async function fetchActiveLeagues(): Promise<ActiveLeagueRow[]> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('leagues')
    .select('uuid, name, starts_at, ends_at')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data as ActiveLeagueRow[]
}

async function fetchLeagueTournaments(leagueUuid: string): Promise<LeagueTournamentDetailRow[]> {
  const supabase = publicSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('uuid, name, starts_at, status, location:locations(name)')
    .eq('league_uuid', leagueUuid)
    .is('deleted_at', null)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data as LeagueTournamentDetailRow[]
}

// leagues[]'s own index stands in for the league's uuid in callback
// payloads — a torneo button already carries the tournament's own uuid, no
// room left in the 64-byte cap for a second full one.
async function legheText(): Promise<FormattedString> {
  const leagues = await fetchActiveLeagues()
  if (!leagues.length) return new FormattedString('🏆 Nessuna lega attiva al momento.')

  const leagueUuids = leagues.map(league => league.uuid)
  const supabase = publicSupabaseClient()
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('league_uuid, status')
    .in('league_uuid', leagueUuids)
    .is('deleted_at', null)

  if (error) throw error
  const { totals, completed } = tournamentProgressByLeague(tournaments as LeagueTournamentRow[])

  const lines = leagues.map((league) => {
    const total = totals.get(league.uuid) ?? 0
    const done = completed.get(league.uuid) ?? 0
    const progress = total > 0 ? ` — ${done}/${total} tappe` : ''
    const start = formatDate(league.starts_at)
    const end = formatDate(league.ends_at)
    const dateRange = start && end ? `${start} → ${end}` : start ? `dal ${start}` : 'data da definire'
    return `🏆 ${dateRange}${progress} — ${league.name}`
  })

  return fmt`🏆 ${FormattedString.b('Leghe attive')}\n\n${FormattedString.join(lines, '\n')}\n\n👇 Tocca una lega per i tornei`
}

// Unlike STATUS_ICON (tournament status), this reflects the chat's own
// registration — shown per button so "am I in" doesn't need a tap-through.
function personalIcon(registration: RegistrationStatus): string {
  if (registration === 'checked_in') return '🎯'
  if (registration === 'registered') return '✅'
  return '🎲'
}

// Exported so tournament/detail.ts's "back" button can rebuild this exact
// list. Returns null for an out-of-range index (stale/tampered callback data).
export async function legaTorneiText(
  index: number, _chatId: number
): Promise<FormattedString | null> {
  const leagues = await fetchActiveLeagues()
  const league = leagues[index]
  if (!league) return null

  const [tournaments, stageNumbers] = await Promise.all([
    fetchLeagueTournaments(league.uuid),
    fetchStageNumbers()
  ])
  const header = fmt`🏆 ${FormattedString.b(league.name)}`

  if (!tournaments.length) return fmt`${header}\n\nNessun torneo in programma per questa lega.`

  const lines = tournaments.map((tournament) => {
    const date = formatDate(tournament.starts_at) ?? 'data da definire'
    const stage = stageLabel(stageNumbers.get(tournament.uuid) ?? null)
    const dateLine = `${statusIcon(tournament.status)} ${date}${stage}`
    const tournamentDetail = tournamentLine({
      status: tournament.status, name: tournament.name, locationName: tournament.location?.name
    })
    return fmt`${dateLine}\n${tournamentDetail}`
  })
  return fmt`${header}\n\n${FormattedString.join(lines, '\n\n')}\n\n👇 Tocca un torneo per i dettagli`
}

async function fetchLegaTorneiButtons(index: number, chatId: number) {
  const leagues = await fetchActiveLeagues()
  const league = leagues[index]
  if (!league) return null

  const [tournaments, stageNumbers] = await Promise.all([
    fetchLeagueTournaments(league.uuid),
    fetchStageNumbers()
  ])
  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const registrations = associateUuid
    ? await fetchRegistrationStatuses(tournaments.map(t => t.uuid), associateUuid)
    : new Map<string, RegistrationStatus>()

  return tournaments.map(tournament => ({
    uuid: tournament.uuid,
    label: tournamentButtonLabel(
      personalIcon(registrations.get(tournament.uuid) ?? null),
      formatDate(tournament.starts_at) ?? 'data da definire',
      stageNumbers.get(tournament.uuid) ?? null,
      tournament.name
    )
  }))
}

// onMenuOutdated: false — see calendario.ts's calendarioMenu for why every
// menu in this bot disables the plugin's built-in staleness fingerprint.
const legheMenu = new Menu<Context>('lg', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  const leagues = await fetchActiveLeagues()
  leagues.forEach((league, index) => {
    range.row().submenu({ text: `🏆 ${league.name}`, payload: String(index) }, 'lt', openLegaTornei)
  })
})

async function openLegaTornei(ctx: Context & { match: string }) {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  try {
    const index = Number(ctx.match)
    const text = await legaTorneiText(index, chatId)
    if (!text) {
      await ctx.answerCallbackQuery({ text: 'Lega non trovata', show_alert: true })
      return
    }
    await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: legheTorneiMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

export const legheTorneiMenu = new Menu<Context>('lt', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  // || not ?? — see calendario.ts's own comment on why.
  const index = Number(ctx.match || '0')
  const chatId = ctx.chat?.id
  if (!chatId) return

  const buttons = await fetchLegaTorneiButtons(index, chatId)
  if (!buttons) return

  for (const button of buttons) {
    const origin = `l${index}`
    range.row().text(
      { text: button.label, payload: `${button.uuid}:${origin}` },
      ctx => openTournamentDetail(ctx, button.uuid, origin)
    )
  }

  // payload: String(index) (not omitted) — same bug class as classifiche.ts's
  // "« Formati": an empty payload never reaches ctx.match, so this would
  // silently fall back to league 0 (or crash if row counts differ).
  range.row().back({
    text: '« Torna alle leghe',
    payload: String(index)
  }, async (ctx) => {
    try {
      const text = await legheText()
      await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: legheMenu })
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

registerMenu('lg', legheMenu)
registerMenu('lt', legheTorneiMenu)

export function registerLegheCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time — see calendario.ts's own comment on why.
  legheMenu.register(legheTorneiMenu)
  legheTorneiMenu.register(torneoMenu)
  bot.use(legheMenu)

  commands.command('leghe', 'Leghe attive', async (ctx) => {
    try {
      const text = await legheText()
      await ctx.reply(text.text, { entities: text.entities, reply_markup: legheMenu })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le leghe, riprova più tardi.')
    }
  })
}
