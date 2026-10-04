// server\utils\telegram\commands\tournaments\leghe.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'

import { statusIcon, stageLabel } from './line'
import { fetchStageNumbers } from './queries'
import { torneoMenu, openTournamentDetail } from './detail'
import { answerLoadError } from '../callbackErrors'
import { registerMenu, registerBackResolver } from '../../menuNav'
import { createPerContextCache } from '../../perContextCache'
import { ICONS } from '../../icons'
import { registerDeepLink } from '../../deepLinks'

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

// Neither cache dedupes a same-update repeat today (legheBlocks and legaTorneiBlocks never both run
// in one update); kept per perContextCache.ts as cheap insurance, not a proven saving.
interface LeagueDetail {
  tournaments: LeagueTournamentDetailRow[]
  stageNumbers: Map<string, number>
}

const memoize = createPerContextCache<{
  leagues: Promise<ActiveLeagueRow[]>
  leagueDetails: Map<string, Promise<LeagueDetail>>
}>()

function cachedFetchActiveLeagues(ctx: Context): Promise<ActiveLeagueRow[]> {
  return memoize(ctx, 'leagues', () => fetchActiveLeagues())
}

// Keyed by leagueUuid, not a single slot: a caller needing two leagues in one update must get two
// real fetches
function cachedFetchLeagueDetail(ctx: Context, leagueUuid: string): Promise<LeagueDetail> {
  const cache = memoize(ctx, 'leagueDetails', () => new Map())
  let entry = cache.get(leagueUuid)
  if (!entry) {
    entry = (async () => {
      const [tournaments, stageNumbers] = await Promise.all([
        fetchLeagueTournaments(leagueUuid),
        fetchStageNumbers([leagueUuid])
      ])
      return { tournaments, stageNumbers }
    })()
    cache.set(leagueUuid, entry)
  }
  return entry
}

// The index in leagues[] stands in for the league uuid in callback payloads: a torneo button
// already carries a tournament uuid, leaving no room in the 64-byte cap for a second
const LG_OPEN_PREFIX = 'lgopen:'

function encodeLgOpenPayload(index: number): string {
  return `${LG_OPEN_PREFIX}${index}`
}

function decodeLgOpenPayload(data: string): number {
  return Number(data.slice(LG_OPEN_PREFIX.length))
}

const LT_OPEN_PREFIX = 'ltopen:'

function encodeLtOpenPayload(uuid: string, index: number): string {
  return `${LT_OPEN_PREFIX}${uuid}:${index}`
}

function decodeLtOpenPayload(data: string): { uuid: string, index: number } {
  const rest = data.slice(LT_OPEN_PREFIX.length)
  const separator = rest.indexOf(':')
  return { uuid: rest.slice(0, separator), index: Number(rest.slice(separator + 1)) }
}

// A button under each league, as a "buttons" block in the rich message body (not a Menu
// reply_markup), like calendario.ts
async function legheBlocks(ctx: Context): Promise<InputRichMessage['blocks']> {
  const leagues = await cachedFetchActiveLeagues(ctx)
  if (!leagues.length) return [{ type: 'paragraph', text: `${ICONS.trophy} Nessuna lega attiva al momento.` }]

  const leagueUuids = leagues.map(league => league.uuid)
  const supabase = publicSupabaseClient()
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('league_uuid, status')
    .in('league_uuid', leagueUuids)
    .is('deleted_at', null)

  if (error) throw error
  const { totals, completed } = tournamentProgressByLeague(tournaments as LeagueTournamentRow[])

  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: `${ICONS.trophy} Leghe attive` }
  ]

  leagues.forEach((league, index) => {
    const total = totals.get(league.uuid) ?? 0
    const done = completed.get(league.uuid) ?? 0
    const start = formatDate(league.starts_at)
    const end = formatDate(league.ends_at)
    const dateRange = start && end ? `${start} → ${end}` : start ? `dal ${start}` : 'data da definire'

    blocks.push({ type: 'paragraph', text: { type: 'bold', text: `${ICONS.trophy} ${league.name}` } })
    if (total > 0) blocks.push({ type: 'paragraph', text: `${ICONS.stats} ${done}/${total} tappe` })
    blocks.push({ type: 'paragraph', text: `${ICONS.date} ${dateRange}` })
    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.trophy} Apri lega`, callback_data: encodeLgOpenPayload(index) }]
    })
  })

  return blocks
}

// Exported so detail.ts's "back" button can rebuild this list. Returns null for an out-of-range
// index (stale/tampered data)
export async function legaTorneiBlocks(ctx: Context, index: number): Promise<InputRichMessage['blocks'] | null> {
  const leagues = await cachedFetchActiveLeagues(ctx)
  const league = leagues[index]
  if (!league) return null

  const { tournaments, stageNumbers } = await cachedFetchLeagueDetail(ctx, league.uuid)
  const blocks: InputRichMessage['blocks'] = [
    { type: 'heading', size: 3, text: `${ICONS.trophy} ${league.name}` }
  ]

  if (!tournaments.length) {
    blocks.push({ type: 'paragraph', text: 'Nessun torneo in programma per questa lega.' })
    return blocks
  }

  for (const tournament of tournaments) {
    const date = formatDate(tournament.starts_at) ?? 'data da definire'
    const stage = stageLabel(stageNumbers.get(tournament.uuid) ?? null)

    blocks.push({ type: 'paragraph', text: `${statusIcon(tournament.status)} ${date}${stage}` })
    blocks.push({
      type: 'paragraph',
      text: [`${statusIcon(tournament.status)} `, { type: 'bold', text: tournament.name }]
    })
    // fallow-ignore-next-line code-duplication -- iscrizioni.ts's location/button block
    if (tournament.location?.name) {
      blocks.push({ type: 'paragraph', text: `${ICONS.location} ${tournament.location.name}` })
    }

    blocks.push({
      type: 'buttons',
      buttons: [{ text: `${ICONS.openDetails} Apri dettagli`, callback_data: encodeLtOpenPayload(tournament.uuid, index) }]
    })
  }

  return blocks
}

// No buttons of its own (see LG_OPEN_PREFIX): kept so legheTorneiMenu's/torneoMenu's send
// permission is installed and detail.ts's back button has a reply_markup (like iscrizioniMenu)
const legheMenu = new Menu<Context>('lg', {
  autoAnswer: false,
  onMenuOutdated: false
})

// Only the "back to leghe" button lives here: per-tournament buttons are inline blocks (see
// legaTorneiBlocks)
export const legheTorneiMenu = new Menu<Context>('lt', {
  autoAnswer: false,
  onMenuOutdated: false
}).dynamic(async (ctx, range) => {
  // || not ??, see calendario.ts
  const index = Number(ctx.match || '0')

  // payload: String(index), not omitted: an empty payload never reaches ctx.match and would fall
  // back to league 0 (same as classifiche.ts "« Formati")
  range.row().back({
    text: '« Torna alle leghe',
    payload: String(index)
  }, async (ctx) => {
    try {
      const blocks = await legheBlocks(ctx)
      await ctx.editMessageText({ blocks }, { reply_markup: legheMenu })
      await ctx.answerCallbackQuery()
    } catch {
      await answerLoadError(ctx)
    }
  })
})

registerMenu('lg', legheMenu)
registerMenu('lt', legheTorneiMenu)

// Rebuilds this league view for detail.ts's "back" button (a registry, see calendario.ts)
registerBackResolver('l', async (ctx, origin) => {
  const index = Number(origin.slice(1))
  const blocks = await legaTorneiBlocks(ctx, index)
    ?? [{ type: 'paragraph', text: `${ICONS.trophy} Lega non trovata.` }]
  return { payload: String(index), menu: legheTorneiMenu, text: { blocks } }
})

// Handles taps on legheBlocks's per-league "buttons" blocks; registered before bot.use(commands),
// own callback_data prefix
async function handleLgOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(LG_OPEN_PREFIX)) return next()

  const index = decodeLgOpenPayload(data)
  try {
    const blocks = await legaTorneiBlocks(ctx, index)
    if (!blocks) {
      await ctx.answerCallbackQuery({ text: 'Lega non trovata', show_alert: true })
      return
    }
    // Set ctx.match before editing so legheTorneiMenu's .dynamic() reads the right index (as in
    // openTournamentDetail)
    ctx.match = String(index)
    await ctx.editMessageText({ blocks }, { reply_markup: legheTorneiMenu })
    await ctx.answerCallbackQuery()
  } catch {
    await answerLoadError(ctx)
  }
}

// Handles taps on legaTorneiBlocks's per-tournament "buttons" blocks
async function handleLtOpenButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(LT_OPEN_PREFIX)) return next()

  const { uuid, index } = decodeLtOpenPayload(data)
  await openTournamentDetail(ctx, uuid, `l${index}`)
}

// Extracted for reuse by t.me/<bot>?start=leghe (deepLinks.ts)
async function legheCommandHandler(ctx: Context) {
  try {
    const blocks = await legheBlocks(ctx)
    await ctx.replyWithRichMessage({ blocks }, { reply_markup: legheMenu })
  } catch {
    await ctx.replyWithRichMessage({
      markdown: `${ICONS.warning} Non sono riuscito a recuperare le leghe, riprova più tardi.`
    })
  }
}

registerDeepLink('leghe', legheCommandHandler)

export function registerLegheCommand(bot: Bot, commands: CommandGroup<Context>) {
  // Deferred to call time, see calendario.ts
  legheMenu.register(legheTorneiMenu)
  legheTorneiMenu.register(torneoMenu)
  bot.use(legheMenu)

  // Registered before bot.use(commands), like calendario.ts
  bot.on('callback_query:data', handleLgOpenButton)
  bot.on('callback_query:data', handleLtOpenButton)

  commands.command('leghe', 'Leghe attive', legheCommandHandler)
}
