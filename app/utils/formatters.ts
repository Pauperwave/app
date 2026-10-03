// app\utils\formatters.ts
// Single source of truth for formatters reused across components (like icons.ts). Intl.NumberFormat
// instances are stateless, so module-level singletons are safe and avoid one construction per
// component instance
export const AMOUNT_FORMATTER = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
