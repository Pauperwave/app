// app\utils\tournaments\dropTime.ts
// "14:32" — the time of day, shown in drop tooltips and (since 2026-09-24)
// the Telegram-reported result badge's own tooltip.
export function formatTimeOfDay(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
