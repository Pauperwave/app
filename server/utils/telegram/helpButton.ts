// server\utils\telegram\helpButton.ts

// The callback prefix of the quick-launch buttons: handled by commands/core.ts, which resolves the
// payload as a deep link
export const HELP_BTN_PREFIX = 'helpbtn:'

// Any command can send a button that opens one of the deep links
export function encodeHelpBtn(payload: string): string {
  return `${HELP_BTN_PREFIX}${payload}`
}
