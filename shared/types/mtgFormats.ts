// shared\types\mtgFormats.ts

// Shared by ManageModal.vue and server/api/mtg-formats/*.post.ts (thin pass-through to Supabase).
export interface NewMtgFormatPayload {
  name: string
  color?: string | null
}
