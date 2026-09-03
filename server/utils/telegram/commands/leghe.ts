// server\utils\telegram\commands\leghe.ts
import { InlineKeyboard } from 'grammy'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { statusIcon, stageLabel, tournamentLine, tournamentButtonLabel } from './tournament/line'
import { fetchRegistrationStatuses, fetchStageNumbers } from './tournament/queries'
import { answerLoadError, editOrResendMessage } from './callbackErrors'
import type { Bot } from 'grammy'
import type { RegistrationStatus } from './tournament/queries'

interface ActiveLeagueRow {
  uuid: string
  name: string
  starts_at: string | null
  ends_at: string | null
}

interface LeagueTournamentRow {
  league_uuid: string | null
  status: string
}

interface LeagueTournamentDetailRow {
  uuid: string
  name: string
  starts_at: string | null
  status: string
  location: { name: string | null } | null
}

// Same "cancelled tournaments don't count toward the denominator" rule as
// useLeaguesQuery.ts's tournamentProgressByLeague — a cancelled tournament
// isn't "still to complete", so progress reads e.g. 3/5, not a permanently
// deflated 3/6.
function progressByLeague(rows: LeagueTournamentRow[]) {
  const totals = new Map<string, number>()
  const completed = new Map<string, number>()
  for (const row of rows) {
    if (!row.league_uuid || row.status === 'cancelled') continue
    totals.set(row.league_uuid, (totals.get(row.league_uuid) ?? 0) + 1)
    if (row.status === 'completed') {
      completed.set(row.league_uuid, (completed.get(row.league_uuid) ?? 0) + 1)
    }
  }
  return { totals, completed }
}

function formatDate(date: string | null): string | null {
  return date ? format(new Date(date), 'd MMM yyyy', { locale: it }) : null
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

// leagues[]'s own index (starts_at ascending, same ordering every render)
// stands in for the league's uuid in callback_data — see tournament/detail.ts's
// backTarget comment for why: callback_data has a 64-byte cap, and a torneo:
// button already carries the tournament's own uuid, no room left for a
// second full one.
async function renderLeghe(): Promise<{ text: string, keyboard: InlineKeyboard | undefined }> {
  const leagues = await fetchActiveLeagues()
  if (!leagues.length) return { text: '🏆 Nessuna lega attiva al momento.', keyboard: undefined }

  const leagueUuids = leagues.map(league => league.uuid)
  const supabase = publicSupabaseClient()
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('league_uuid, status')
    .in('league_uuid', leagueUuids)
    .is('deleted_at', null)

  if (error) throw error
  const { totals, completed } = progressByLeague(tournaments as LeagueTournamentRow[])

  const lines = leagues.map((league) => {
    const total = totals.get(league.uuid) ?? 0
    const done = completed.get(league.uuid) ?? 0
    const progress = total > 0 ? ` — ${done}/${total} tappe` : ''
    const start = formatDate(league.starts_at)
    const end = formatDate(league.ends_at)
    const dateRange = start && end ? `${start} → ${end}` : start ? `dal ${start}` : 'data da definire'
    return `🏆 ${dateRange}${progress} — ${league.name}`
  })

  const keyboard = new InlineKeyboard()
  leagues.forEach((league, index) => {
    keyboard.row().text(`🏆 ${league.name}`, `lega:${index}`)
  })

  return {
    text: `🏆 *Leghe attive*\n\n${lines.join('\n')}\n\n👇 Tocca una lega per i tornei`,
    keyboard
  }
}

// The list icon (STATUS_ICON) reflects the tournament's own status; this
// one reflects the linked chat's own registration to that specific
// tournament — same three states as tournament/detail.ts's detail-view button,
// shown here directly on each list button so "am I in for this stage"
// doesn't require tapping through to every tournament's detail.
function personalIcon(registration: RegistrationStatus): string {
  if (registration === 'checked_in') return '🎯'
  if (registration === 'registered') return '✅'
  return '🎲'
}

async function renderLegaTornei(
  index: number, chatId: number
): Promise<{ text: string, keyboard: InlineKeyboard } | null> {
  const leagues = await fetchActiveLeagues()
  const league = leagues[index]
  if (!league) return null

  const [tournaments, stageNumbers] = await Promise.all([
    fetchLeagueTournaments(league.uuid),
    fetchStageNumbers()
  ])
  const header = `🏆 *${league.name}*`

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const registrations = associateUuid
    ? await fetchRegistrationStatuses(tournaments.map(t => t.uuid), associateUuid)
    : new Map<string, RegistrationStatus>()

  let text = `${header}\n\nNessun torneo in programma per questa lega.`
  if (tournaments.length) {
    const lines = tournaments.map((tournament) => {
      const date = formatDate(tournament.starts_at) ?? 'data da definire'
      const stage = stageLabel(stageNumbers.get(tournament.uuid) ?? null)
      const dateLine = `${statusIcon(tournament.status)} ${date}${stage}`
      return `${dateLine}\n${tournamentLine({ status: tournament.status, name: tournament.name, locationName: tournament.location?.name })}`
    })
    text = `${header}\n\n${lines.join('\n\n')}\n\n👇 Tocca un torneo per i dettagli`
  }

  const keyboard = new InlineKeyboard()
  for (const tournament of tournaments) {
    const icon = personalIcon(registrations.get(tournament.uuid) ?? null)
    const date = formatDate(tournament.starts_at) ?? 'data da definire'
    const stageNumber = stageNumbers.get(tournament.uuid) ?? null
    const label = tournamentButtonLabel(icon, date, stageNumber, tournament.name)
    keyboard.row().text(label, `torneo:${tournament.uuid}:l${index}`)
  }
  keyboard.row().text('« Torna alle leghe', 'leghe:list')

  return { text, keyboard }
}

export function registerLegheCommand(bot: Bot) {
  bot.command('leghe', async (ctx) => {
    try {
      const { text, keyboard } = await renderLeghe()
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le leghe, riprova più tardi.')
    }
  })

  // Each handler answers the callback_query exactly once, at the very
  // end — a second answer throws GrammyError "query is too old...",
  // uncaught, which used to take the whole webhook request down with a
  // 500 (confirmed 2026-09-03 as the actual cause behind "the bot
  // doesn't respond" whenever these handlers' own error path fired).
  bot.callbackQuery(/^leghe:list$/, async (ctx) => {
    try {
      const { text, keyboard } = await renderLeghe()
      await editOrResendMessage(ctx, text, keyboard)
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })

  bot.callbackQuery(/^lega:(\d+)$/, async (ctx) => {
    const index = Number(ctx.match[1])
    const chatId = ctx.chat?.id

    if (!chatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }

    try {
      const rendered = await renderLegaTornei(index, chatId)
      if (!rendered) {
        await ctx.answerCallbackQuery({ text: 'Lega non trovata', show_alert: true })
        return
      }

      try {
        await ctx.editMessageText(rendered.text, { parse_mode: 'Markdown', reply_markup: rendered.keyboard })
      } catch {
        await ctx.deleteMessage().catch(() => {})
        await ctx.reply(rendered.text, { parse_mode: 'Markdown', reply_markup: rendered.keyboard })
      }
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
}
