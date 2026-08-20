// app\types\fast-levenshtein.d.ts
// fast-levenshtein ships no types and there's no @types package for it —
// only the one function actually used (associatesGlobalFilterFn.ts) is
// declared here, not the library's full surface.
declare module 'fast-levenshtein' {
  export function get(a: string, b: string): number
}
