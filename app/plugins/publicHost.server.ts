// app\plugins\publicHost.server.ts
// Reads the flag set by server/middleware/public-host.ts and serializes it
// into the SSR payload, so auth.global.ts can read it synchronously on
// client hydration instead of re-deriving it from window.location.
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  useState('isPublicHost', () => Boolean(event?.context.isPublicHost))
})
