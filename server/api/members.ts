// server\api\members.ts
import type { Member } from '~/types'

// Roles from docs/architecture/roles.md's bootstrap table (2026-08-10,
// corrected/expanded 2026-08-11: Cazzola/Cordeschi/Castelli are admin, not
// organizer; Marisa/Festi/Baldo added as organizer) — the only people with a
// non-default role once the real DB migration lands; everyone else defaults
// to 'player'.
const members: Member[] = [
  {
    name: 'Emanuele Nardi',
    role: 'super_admin'
  },
  {
    name: 'Marco Cazzola',
    role: 'admin'
  },
  {
    name: 'Nicola Cordeschi',
    role: 'admin'
  },
  {
    name: 'Lorenzo Castelli',
    role: 'admin'
  },
  {
    name: 'Simone Marisa',
    role: 'organizer'
  },
  {
    name: 'Gianluca Festi',
    role: 'organizer'
  },
  {
    name: 'Riccardo Baldo',
    role: 'organizer'
  }
]

export default eventHandler(async () => {
  return members
})
