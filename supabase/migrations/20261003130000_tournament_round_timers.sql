-- supabase\migrations\20261003130000_tournament_round_timers.sql
-- One row per tournament round holding the organizer's round timer (pre / round / turns / ended),
-- so the Telegram turns Mini App can follow the event clock instead of running its own.
-- Written by the organizer's timer through a BFF endpoint, read by the Mini App through another
-- (service role): staff only, no public read.
-- The elapsed time is stored as a start instant (running) or a frozen elapsed value (paused), never
-- a ticking counter, so a reader derives the remaining time from its own clock.
create table public.tournament_round_timers (
  tournament_uuid uuid not null,
  round_number integer not null,
  phase text not null default 'pre',
  is_running boolean not null default false,
  -- When the current phase effectively started (pauses excluded); null while paused or stopped
  phase_started_at timestamptz,
  paused_elapsed_seconds integer not null default 0,
  -- Total lengths in seconds: a reader cascades through the phases that elapsed since the last write
  pre_seconds integer not null,
  round_seconds integer not null,
  turns_seconds integer not null,
  updated_at timestamptz not null default now(),
  constraint pk_tournament_round_timers primary key (tournament_uuid, round_number),
  constraint fk_tournament_round_timers_tournament_uuid_fkey
    foreign key (tournament_uuid) references public.tournaments (uuid)
    on update cascade on delete cascade,
  constraint ck_tournament_round_timers_phase check (phase in ('pre', 'round', 'turns', 'ended')),
  constraint ck_tournament_round_timers_seconds check (
    paused_elapsed_seconds >= 0 and pre_seconds >= 0 and round_seconds >= 0 and turns_seconds >= 0
  )
);

alter table public.tournament_round_timers enable row level security;

create policy management_full_access on public.tournament_round_timers
  for all
  using (public.has_management_permissions(auth.uid()))
  with check (public.has_management_permissions(auth.uid()));
