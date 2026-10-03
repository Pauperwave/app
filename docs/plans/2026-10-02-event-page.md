# Event page: modeled on Radio Atog 2026

<!-- docs/plans/2026-10-02-event-page.md -->

Design for the event entity and its page, worked out against a real, running event:
[Radio Atog 2026](https://www.cardgamecorner.com/it/radio-atog-2026) (Pauperwave N.6, 2-4 October 2026, Mori).
Decisions are the user's, 2026-10-02.

## Decisions

- **An event is a folder.** It only groups tournaments; it has no dates of its own. Its span is
  derived from its tournaments (earliest start, latest end), the same way a league's is (ADR-019).
  Today the 10 events in the database have hand-written dates and no tournaments linked, and
  Radio Atog is stored as a single evening (2 Oct 20:00-00:00) although it runs three days.
- **The page is a hub for organizers/admins** (no visibility change, same as every other page): a
  quick way into each tournament's own page and to edit tournaments. Main view: a day/week calendar
  with the tournaments along the day.
- **Reuse first**: existing components (`DaySchedule.vue`, `TournamentsListAddModal.vue`/`EditModal.vue`,
  `ViewModeTabs`, `TournamentsListGridView`) and Nuxt UI, before anything new.

## What Radio Atog needs, and where it goes

| Information | Radio Atog | Model |
|---|---|---|
| Name, tagline, edition | "Eat, Drink, Combat, Repeat", 6th edition | event: tagline, edition number |
| Dates | 2-4 October | derived from the tournaments |
| Program per day | Fri Vintage Cube, Sat Team Trios, Sun Singleton + Draft | the event's tournaments |
| Registration/check-in time | Singleton: registration 09:30, start 10:00 | tournament: registration time, **all formats** (the Telegram bot opens registrations from it) |
| Fees | Trios 45€ members / 50€ non-members, Singleton 15/20€, Draft 16€, Cube free | tournament: member and non-member fee (1v1/Pauper) |
| Capacity | max 33 teams, max 99 players | tournament: max entrants (1v1/Pauper) |
| Decklists | public (Trios), secret (Singleton) | tournament: decklist visibility (1v1/Pauper) |
| Partners | Orangucards, Lega Pauper Italia (collaborators), Cardmarket (sponsor) | event: **any number** of partners, each with name, role, logo, link |
| Venue, parking | Amici di Molina, Mori; parking at the stadium | location (exists); practical notes on the event |
| Tickets, membership | tickets from 1 September on cardgamecorner; membership required | event: ticket link and sale start, "membership required" with link |
| Shop details (La Fenice, hours, VAT) | - | not the event's: locations/organizers already hold them |

The Friday Vintage Cube is a tournament like the others. How cubes run still has to be modeled; for
now its format is enough, plus an initial pod-draft phase later.

## Steps

1. **Calendar view (done, 2026-10-02)**: one hour column per event day, "Giorno"/"Settimana" views,
   a tournament block links to its page and has an edit pencil, an empty slot creates a tournament
   on that day and hour (`DaySchedule.vue`, `eventScheduleDays.ts`).
2. **Event as a folder (done, 2026-10-02, ADR-053)**: `events.starts_at`/`ends_at` derived from the
   tournaments after every tournament write (`recomputeEventDates`, `server/utils/derivedDates.ts`),
   no date/time fields in the event forms, an event with no tournaments yet has no dates.
   Still to do: link the existing tournaments to their events (data work: today none are linked).
3. **Tournament fields (done, 2026-10-03, migration 20261003110000)**: `entry_fee_non_member`
   (`entry_fee` is the members' price, null = same for everyone), `max_entrants` (self-registration —
   web and Telegram bot — stops at it; an organizer can still go over), `decklist_visibility`
   (public/secret) and `registration_at` (on-site registration time, named so it can't be mixed up
   with a registration's `checked_in_at`). In the tournament forms, the calendar detail and filled
   in for Radio Atog. `registration_at` is only stored and shown for now: nothing opens or closes
   registrations by it (that would block the pre-registration the app is built around).
4. **Event fields (done, 2026-10-03, migration 20261003120000)**: `tagline`, `edition`,
   `description`, `practical_notes`, `tickets_url`, `tickets_on_sale_on`, `membership_required` +
   `membership_url`, and the `event_partners` table (name, role collaborator/sponsor, logo URL, link,
   position; public to read). In the event forms (`events/fields/DetailFields.vue`,
   `PartnersEditor.vue`; saving replaces the whole partner list) and on the event page
   (`events/single/Details.vue`). Filled in for Radio Atog.
5. **Cube**: an initial pod-draft phase before the rounds.

## Later (wanted, not scheduled)

- **Team tournaments** (Team Trios): team registration and team pairings.
- **Decklist upload**, with a check that a team's lists don't share cards.
