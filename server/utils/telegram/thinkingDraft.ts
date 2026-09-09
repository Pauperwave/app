// server\utils\telegram\thinkingDraft.ts
import type { Context } from 'grammy'

// Native Telegram rich-message loading animation (the "shimmer" Durov
// showed off alongside rich messages) — sendRichMessageDraft shows an
// ephemeral ~30s preview. We never "confirm" it via sendRichMessage: the
// real reply that follows a moment later (well under 30s) just lands as its
// own message once ready, and the draft is gone by then on its own. Not
// awaited by callers — fired alongside the real fetch, not before it, so it
// never adds latency; a failure here must never block the real reply.
export function showThinkingDraft(
  ctx: Context,
  text = '✨ Sto pensando...'
) {
  void ctx
    .replyWithRichMessageDraft({ markdown: text })
    .catch(() => {})
}
