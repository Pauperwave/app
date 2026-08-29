// server\utils\requireUserEmail.ts
import type { H3Event } from 'h3'

// Shared by renew.post.ts/tesseramento-status.get.ts — both resolve the
// logged-in user purely by email (no associate uuid in the session), and
// need that email present to look anything up.
export async function requireUserEmail(event: H3Event): Promise<string> {
  const user = await requireUser(event)
  if (!user.email) {
    throw createError({ statusCode: 401, statusMessage: 'Email non presente nella sessione' })
  }
  return user.email
}
