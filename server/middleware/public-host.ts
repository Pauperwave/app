// server\middleware\public-host.ts
import { PUBLIC_HOSTS } from '#shared/utils/publicHosts'

export default defineEventHandler((event) => {
  const host = getHeader(event, 'host')?.toLowerCase()
  event.context.isPublicHost = host ? (PUBLIC_HOSTS as readonly string[]).includes(host) : false
})
