// shared\types\notifications.ts

// Outcome of a passive Telegram notification batch, returned by the endpoints
// that announce tables so the organizer's UI can show who was reached.
export interface AssociateNotifyResult {
  sent: number
  // No Telegram link: nothing to send, the organizer has to tell them in person.
  notLinked: number
  // Linked but Telegram rejected the message (e.g. the player blocked the bot).
  failed: number
}
