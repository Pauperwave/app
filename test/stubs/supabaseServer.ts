// test\stubs\supabaseServer.ts
// Stands in for '#supabase/server' (a Nuxt-module virtual import) so server code that imports it
// can be loaded under vitest; tests replace it with vi.mock.
export function serverSupabaseServiceRole(): never {
  throw new Error('#supabase/server is stubbed: mock serverSupabaseServiceRole in the test')
}
