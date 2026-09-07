// server\utils\telegram\commands\tournaments\leghe.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { FormattedString } from '@grammyjs/parse-mode'

import { statusIcon, stageLabel, tournamentLine, tournamentButtonLabel, personalIcon } from './line'
import { fetchRegistrationStatuses, fetchStageNumbers } from './queries'
import type { RegistrationStatus } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { answerLoadError } from '../callbackErrors'
import { registerMenu } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'

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

// legheText/legheMenu.dynamic (initial command) and legaTorneiText/
// fetchLegaTorneiButtons (opening a league) each independently re-run
// within the same update — memoizing by ctx dedupes both pairs. See
// perContextCache.ts.
interface LeagueDetail {
  tournaments: LeagueTournamentDetailRow[]
  stageNumbers: Map<string, number>
}

const memoize = createPerContextCache<{
  leagues: Promise<ActiveLeagueRow[]>
  leagueDetail: Promise<LeagueDetail>
}>()

function cachedFetchActiveLeagues(ctx: Context): Promise<ActiveLeagueRow[]> {
  return memoize(ctx, 'leagues', () => fetchActiveLeagues())
}

function cachedFetchLeagueDetail(ctx: Context, leagueUuid: string): Promise<LeagueDetail> {
  return memoize(ctx, 'leagueDetail', async () => {
    const [tournaments, stageNumbers] = await Promise.all([
      fetchLeagueTournaments(leagueUuid),
      fetchStageNumbers([leagueUuid])
    ])
    return { tournaments, stageNumbers }
  })
}

// leagues[]'s own index stands in for the league's uuid in callback
// payloads — a torneo button already carries the tournament's own uuid, no
// room left in the 64-byte cap for a second full one.
async function legheText(ctx: Context): Promise<FormattedString> {
  const leagues = await cachedFetchActiveLeagues(ctx)
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

  const blocks = leagues.map((league) => {
    const total = totals.get(league.uuid) ?? 0
    const done = completed.get(league.uuid) ?? 0
    const start = formatDate(league.starts_at)
    const end = formatDate(league.ends_at)
    const dateRange = start && end ? `${start} → ${end}` : start ? `dal ${start}` : 'data da definire'

    const leagueLines: (FormattedString | string)[] = [fmt`🏆 ${FormattedString.b(league.name)}`]
    if (total > 0) leagueLines.push(`📊 ${done}/${total} tappe`)
    leagueLines.push(`🗓️ ${dateRange}`)
    return FormattedString.join(leagueLines, '\n')
  })

  return fmt`🏆 ${FormattedString.b('Leghe attive')}\n\n${FormattedString.join(blocks, '\n\n')}\n\n👇🏻 Tocca una lega per i tornei`
}

// Exported so tournament/detail.ts's "back" button can rebuild this exact
// list. Returns null for an out-of-range index (stale/tampered callback data).
export async function legaTorneiText(
  ctx: Context, index: number, _chatId: number
): Promise<FormattedString | null> {
  const leagues = await cachedFetchActiveLeagues(ctx)
  const league = leagues[index]
  if (!league) return null

  const { tournaments, stageNumbers } = await cachedFetchLeagueDetail(ctx, league.uuid)
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
  return fmt`${header}\n\n${FormattedString.join(lines, '\n\n')}\n\n👇🏻 Tocca un torneo per i dettagli`
}

async function fetchLegaTorneiButtons(ctx: Context, index: number, chatId: number) {
  const leagues = await cachedFetchActiveLeagues(ctx)
  const league = leagues[index]
  if (!league) return null

  const { tournaments, stageNumbers } = await cachedFetchLeagueDetail(ctx, league.uuid)
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
  const leagues = await cachedFetchActiveLeagues(ctx)
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
    const text = await legaTorneiText(ctx, index, chatId)
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

  const buttons = await fetchLegaTorneiButtons(ctx, index, chatId)
  if (!buttons) return

  for (const button of buttons) {
    const origin = `l${index}`
    // payload: String(index), not the `${uuid}:${origin}` pair the handler
    // actually needs (it gets those from this closure instead) — this
    // menu's own re-render (for the row/col lookup on press) decodes
    // ctx.match as `Number(ctx.match || '0')` above. A composite payload
    // would parse to NaN there, making fetchLegaTorneiButtons(NaN, ...)
    // return null and crash the plugin's row/col lookup with no visible
    // error. Confirmed 2026-09-06 ("/leghe → lega → torneo: no response").
    range.row().text(
      { text: button.label, payload: String(index) },
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
      const text = await legheText(ctx)
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
      const text = await legheText(ctx)
      await ctx.reply(text.text, { entities: text.entities, reply_markup: legheMenu })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le leghe, riprova più tardi.')
    }
  })
}
