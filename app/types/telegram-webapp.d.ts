// app\types\telegram-webapp.d.ts
// The Telegram Web App SDK (telegram-web-app.js) ships no types and there's
// no @types package for it — only the surface actually used
// (app/pages/telegram/turni.vue) is declared here, not its full API.
interface TelegramWebAppHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
}

interface TelegramWebApp {
  ready(): void
  expand(): void
  HapticFeedback: TelegramWebAppHapticFeedback
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}
