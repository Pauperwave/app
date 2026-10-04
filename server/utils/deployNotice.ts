// server\utils\deployNotice.ts
import { createHash, timingSafeEqual } from 'node:crypto'
import { escapeHtml } from '~~/server/utils/telegram/html'
import { ICONS } from '~~/server/utils/telegram/icons'

// What .github/workflows/deploy-notice.yml posts once Vercel reports a finished deployment, and how
// the super admins are told about it.

export interface DeployNotice {
  environment: string
  ref: string | null
  sha: string | null
  message: string | null
}

const MAX_FIELD_LENGTH = 300
const SHORT_SHA_LENGTH = 7

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const text = value.trim().slice(0, MAX_FIELD_LENGTH)
  return text || null
}

// Null for anything that isn't a notice: the body comes from the network
export function parseDeployNotice(body: unknown): DeployNotice | null {
  if (!body || typeof body !== 'object') return null

  const fields = body as Record<string, unknown>
  const environment = optionalText(fields.environment)
  if (!environment) return null

  return {
    environment,
    ref: optionalText(fields.ref),
    sha: optionalText(fields.sha),
    message: optionalText(fields.message)?.split('\n')[0] ?? null
  }
}

export function isProductionDeploy(notice: DeployNotice): boolean {
  return notice.environment.toLowerCase() === 'production'
}

// Both sides are hashed first so the comparison takes the same time whatever their lengths. With no
// secret configured nothing is accepted.
export function isDeployNoticeSecretValid(
  provided: string | undefined,
  expected: string | undefined
): boolean {
  if (!provided || !expected) return false

  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(provided), digest(expected))
}

// HTML (parse_mode 'HTML'): the commit sits in a monospace block under the heading
export function buildDeployNoticeText(notice: DeployNotice): string {
  const heading = `${ICONS.rocket} Deploy in produzione completato`

  const commit = [notice.ref, notice.sha?.slice(0, SHORT_SHA_LENGTH)]
    .filter(part => part !== null && part !== undefined)
    .join(' · ')
  const lines = [commit || null, notice.message].filter(line => line !== null)
  if (lines.length === 0) return heading

  return `${heading}\n<pre>${escapeHtml(lines.join('\n'))}</pre>`
}
