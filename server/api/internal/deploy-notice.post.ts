// server\api\internal\deploy-notice.post.ts

// Called by .github/workflows/deploy-notice.yml when Vercel finishes a deployment. Not for users:
// it is authenticated by a secret shared with that workflow, and only a production deployment
// tells the super admins anything.
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig(event).deployNoticeSecret
  if (!isDeployNoticeSecretValid(getHeader(event, 'x-deploy-notice-secret'), secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const notice = parseDeployNotice(await readBody(event))
  if (!notice) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid deploy notice' })
  }
  if (!isProductionDeploy(notice)) return { sent: false }

  await notifyTelegramSuperAdmins(event, buildDeployNoticeText(notice), { parse_mode: 'HTML' })
  return { sent: true }
})
