// app\utils\tournaments\dropTime.ts
// "14:32" — the time of day a player dropped, shown in the drop tooltips.
export function formatDropTime(droppedAt: string): string {
  return new Date(droppedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
