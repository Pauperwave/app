// app\utils\trash\trashRetention.ts
import { differenceInCalendarDays, parseISO } from 'date-fns'

// User-requested countdown (2026-08-23): a soft-deleted row is eligible for
// permanent purge `retentionDays` after deletedAt — configurable from
// /settings (pauperwave_settings.trash_retention_days,
// useSettingsQuery.ts's AppSettings.trashRetentionDays), enforced server-side
// by pg_cron's purge_expired_trash() (migration 20260823120000). This
// fallback only covers the brief window before that setting has loaded.
export const DEFAULT_TRASH_RETENTION_DAYS = 60

export type TrashRetentionColor = 'success' | 'warning' | 'error'

export interface TrashRetentionInfo {
  daysRemaining: number
  color: TrashRetentionColor
}

// Same "band the raw number into a color" shape as wantedCardAge.ts's
// wantedCardAgeInfo, inverted: urgency rises as daysRemaining falls instead
// of as age grows.
export function trashRetentionInfo(deletedAt: string, retentionDays: number): TrashRetentionInfo {
  const daysSinceDeletion = differenceInCalendarDays(new Date(), parseISO(deletedAt))
  const daysRemaining = Math.max(retentionDays - daysSinceDeletion, 0)

  const color: TrashRetentionColor = daysRemaining <= 0
    ? 'error'
    : daysRemaining <= 7 ? 'warning' : 'success'

  return { daysRemaining, color }
}
