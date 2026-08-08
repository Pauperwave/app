// app\utils\error.ts

export function toErrorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

// True when a caught $fetch error is a 409 Conflict.
export function isConflictError(err: unknown): boolean {
  return typeof err === 'object' && err !== null
    && 'statusCode' in err && (err as { statusCode?: number }).statusCode === 409
}
