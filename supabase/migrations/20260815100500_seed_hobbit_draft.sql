-- Seeds the one real (non-mock) tournament the user asked for: the "Lo
-- Hobbit" Draft, previously hardcoded in server/api/tournaments.ts. Also
-- seeds the location/organization/format rows it references — all three
-- tables were empty (app has run entirely on mock data until now).

insert into public.locations (name, address, city, province, postal_code)
values ('Smart Lab - Centro Giovani Rovereto', 'V.le Trento, 47/49', 'Rovereto', 'TN', '38068');

insert into public.organizations (name, type)
values ('PauperWave', 'association');

insert into public.mtg_formats (name)
values ('Draft');

insert into public.tournaments (
  name, status, format_uuid, location_uuid, organizer_uuid,
  datetime, entry_fee, description, prizes, image_url,
  contact_name, contact_phone, registered_players, participant_names
)
select
  'Draft "Lo Hobbit"',
  'registration_open',
  (select uuid from public.mtg_formats where name = 'Draft'),
  (select uuid from public.locations where name = 'Smart Lab - Centro Giovani Rovereto'),
  (select uuid from public.organizations where name = 'PauperWave'),
  -- Next Aug 30th from today, same "roll forward a year if already passed"
  -- reasoning as the mock fixture it replaces.
  (case when (current_date > make_date(extract(year from current_date)::int, 8, 30))
    then make_date(extract(year from current_date)::int + 1, 8, 30)
    else make_date(extract(year from current_date)::int, 8, 30)
  end)::timestamptz + interval '14 hours',
  21.00,
  E'Start: 14:10 (4 buste a partecipante + 1 di premio).\n\nL''iscrizione al draft associativo può essere pagata con 4 bustine de "Lo Hobbit" (possibilmente in lingua Inglese, quelle in italiano verranno eventualmente messe in premio).',
  'Buoni acquisto e gadget',
  'https://images.ctfassets.net/s5n2t79q9icq/2jyTggK2QocU3Hx5V5O6PI/b20a4df9a36f623c7002d8011a55ee53/OVWJJVEWPPD_1023x700.webp?q=80&w=1023&h=1536&fit=crop&f=center&fm=webp',
  'Nicola',
  '35188033399',
  16,
  array[
    'Nicola Cordeschi', 'Roberto Caliari', 'Marco Campostrini', 'Giulia Grillini',
    'Simone Marisa', 'Luca Ferrando', 'Stefano Fait', 'Luca Atanasio',
    'Nicola March', 'Trettel Marco', 'Mattia Slaifer', 'Davide Bonecher',
    'Michele Grandi', 'Andrea Bontempo', 'Francesco Dellagiacoma', 'Michele Giovanelli'
  ];
