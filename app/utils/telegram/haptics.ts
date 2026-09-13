// app\utils\telegram\haptics.ts
export function telegramHaptic() {
  return window.Telegram?.WebApp?.HapticFeedback
}
