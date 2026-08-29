// app\utils\formatters.ts
// Single source of truth for formatters reused across many components —
// same "reuse an existing constant" reasoning as icons.ts. Intl.NumberFormat
// instances are stateless/immutable, safe to share as module-level
// singletons instead of re-constructing one per component instance.
export const AMOUNT_FORMATTER = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
