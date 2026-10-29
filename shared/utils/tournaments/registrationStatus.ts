// shared\utils\tournaments\registrationStatus.ts

// A tournament under way can still be joined at a later round, so registrations stay open after
// the first round starts
export function acceptsRegistrations(status: string): boolean {
  return REGISTRATION_STATUSES.includes(status)
}

// Declared last: an export right after an array literal is dropped from Nuxt's auto-imports
export const REGISTRATION_STATUSES = ['registration_open', 'in_progress']
