-- Imports the 81 associates who exist in the historical Google Form roster
-- (.scratch/associates.csv) but were never entered into the DB, found via the
-- reconciliation in .scratch/diff_report2.txt (2026-08-12, never acted on).
-- Started as 83, reduced to 81: rik.nicolin@gmaio.com was a typo'd duplicate
-- of the already-existing id=36 Riccardo Nicolin (matched by name, not email
-- -- explains why that id showed up as "DB associate with no matching sheet
-- row"); Larisa Stanca's sheet row has an unusable email ('laris', not a
-- real address) and is excluded pending manual follow-up.
--
-- All inserted as membership_request_status = 'approved' (they already
-- completed the real historical signup+payment flow, this is backfill, not
-- new applications) with pauperwave_associate_number left null (the sheet's
-- numbers are proven unreliable -- 9 of these 81 collide with numbers the DB
-- has since reassigned to entirely different people after a renumbering;
-- nothing in the app auto-assigns this field today either, same as always).
--
-- Individual data fixes applied while preparing this migration (see the
-- generation scripts in .scratch/ for the full derivation): 4 names had a
-- stray underscore where a space/apostrophe belongs (CSV export artifact),
-- 2 postal codes and 5 provinces had a full city name typed in instead of
-- the field's real value, one tax_code was a placeholder (the person's own
-- surname, not a real code -- left null), and one birth year (1950) directly
-- contradicted what that person's own tax code encodes (98 -> corrected to
-- 1998).
--
-- pauperwave_associate_renewals rows created for the 68 (of 81) who have a
-- recorded data_pagamento in the sheet, mirroring the exact backfill logic
-- of the original 242 (migration 20260805035231) -- so membership_status
-- computes correctly instead of showing everyone as 'expired'.

insert into public.pauperwave_associates (
  first_name, last_name, email_address, tax_code, born_date, born_location,
  residency_address, residency_cap, residency_city, residency_province, phone_number,
  consent_data, consent_social, has_acknowledged_surveillance_notice, has_read_statute,
  membership_request_status, request_date, payment_date, association_date
) values
    ('Filippo', 'Ghidoni', 'filippo.ghidoni89@gmail.com', 'GHDFPP89E10L378F', '1989-05-10', 'Trento', 'Endrici 13', '38122', 'Trento', 'TN', '3400570073', true, true, true, true, 'approved', '2025-11-07T20:23:15', '2026-02-20', '2026-02-20'),
    ('Gabriele', 'Divan', 'gabriele.divan@gmail.com', 'DVNGRL98E02L378E', '1998-05-02', 'Trento', 'Via Della Saluga 11', '38121', 'Trento', 'TN', '3477741376', true, true, true, true, 'approved', '2025-10-24T20:14:09', '2026-01-22', '2026-01-22'),
    ('Emanuele', 'Corbellini', 'emn.crb@gmail.com', 'CRBMNL97A16H501A', '1997-01-16', 'Roma', 'Via del boschetto 108', '00184', 'Roma', 'RM', '3206958780', true, true, true, true, 'approved', '2025-10-24T20:17:28', '2026-01-23', '2026-01-23'),
    ('Federico', 'Covi', 'federico.covi@gmail.com', 'CVOFRC90C30H612G', '1990-03-30', 'Rovereto', 'Via a prato 46/E', '38068', 'Rovereto', 'TN', '3444680837', true, true, true, true, 'approved', '2025-10-24T20:18:52', '2026-02-12', '2026-02-12'),
    ('Lorenzo', 'Righi', 'lorenzorighi.sm@gmail.com', 'RGHLNZ95E08Z130O', '1995-05-08', 'Repubblica San Marino', 'Via Innocenzo Cappa 54', '47895', 'Domagnano (RSM)', 'EE', '3396186416', true, true, true, true, 'approved', '2025-10-24T20:16:23', null, null),
    ('Manuel', 'Sonn', 'sonn.m@hotmail.it', 'SNNMNLL89R21L378O', '1989-10-21', 'trento', 'Campi 5', '39040', 'Cortina Sulla Strada del Vino', 'BZ', '3343192059', true, true, true, true, 'approved', '2025-11-28T20:17:53', '2026-02-20', '2026-02-20'),
    ('Fabrizio', 'Marchi', 'fabriziomarchi79@gmail.com', 'MRCFRZ79M30L378O', '1979-08-30', 'Trento', 'Via dell’Angi, 9', '38057', 'Pergine Valsugana', 'TN', '3463285991', true, true, true, true, 'approved', '2025-12-01T12:58:04', null, null),
    ('Alessio', 'Nicolini', 'alessionicolini92@gmail.com', 'NCLLSS92L25F382E', '1992-07-25', 'Monselice', 'Via Brodolini 7/A', '35020', 'Albignasego', 'PD', '3474996184', true, true, true, true, 'approved', '2025-12-10T18:04:31', null, null),
    ('Francesco', 'mariotti', 'francesco.mariotti.tn@gmail.com', 'MRTFNC91D25L378I', '1991-04-25', 'Trento', 'Strada delle Tabarelle, 184', '38123', 'Trento', 'TN', '3314954709', true, true, true, true, 'approved', '2025-12-11T12:08:52', '2026-04-28', '2026-04-28'),
    ('Nicolò', 'Bonichini', 'nicolobonichini@gmail.com', 'BNCNCL05L08L387Q', '2005-07-08', 'Trento', 'Via dei Roncati, 63', '38057', 'Ischia', 'TN', '3425882556', true, true, true, true, 'approved', '2025-12-12T19:21:36', null, null),
    ('Mattia', 'Novembre', 'mattia.novembre2005@gmail.com', 'NVMMTT05C29B160Q', '2005-03-29', 'Bressanone', 'Via castagneto 1 f', '38050', 'Novaledo', 'TN', '3755652930', true, true, true, true, 'approved', '2025-12-13T12:38:21', null, null),
    ('Franco', 'Perotto', 'soyelbosterofranco@hotmail.com', 'PRTFNC98L19Z600B', '1998-07-19', 'Ciudadela (arg)', 'Via Bronzetti 12', '38122', 'Trento', 'TN', '3383752310', true, true, true, true, 'approved', '2025-12-18T10:20:48', null, null),
    ('Alessandro', 'Olivo', 'olivo.alessandro@gmail.com', 'LVOLSN93A25H612K', '1993-01-25', 'Rovereto', 'via Vannetti 7', '38068', 'Rovereto', 'TN', '3493097223', true, true, true, true, 'approved', '2025-12-18T12:03:08', null, null),
    ('Giulia', 'Grillini', 'giuliagrillini@gmail.com', 'GRLGLI96R62A944E', '1996-10-22', 'Bologna', 'Corso della libertà 50', '39100', 'Bolzano', 'BZ', '3387965639', true, true, true, true, 'approved', '2025-12-18T16:13:37', '2026-02-19', '2026-02-19'),
    ('Daniele', 'Tonelli', 'daniele.tonelli.1982@gmail.com', 'TNLDNL82A17H612D', '1982-01-17', 'Rovereto', 'Via Giacomo Leopardi 12', '38062', 'Arco', 'TN', '3463836526', true, true, true, true, 'approved', '2025-12-18T22:25:49', null, null),
    ('Luca', 'Boninsegna', 'jackemall@hotmail.it', 'BNNLCU90E24C372B', '1990-05-24', 'Cavalese', 'Via professor Simone Dellagiacoma 22', '38037', 'Predazzo', 'TN', '3402861782', true, true, true, true, 'approved', '2025-12-21T13:35:41', '2026-05-07', '2026-05-07'),
    ('Tito', 'Zoppello', 'titozoppello@gmail.com', 'ZPPTTI99E25F132T', '1999-05-25', 'Merano', 'Via Medici 8/1', '38123', 'Trento', 'TN', '3514770468', true, true, true, true, 'approved', '2026-01-02T20:33:26', '2026-01-02', '2026-01-02'),
    ('Emanuele', 'Macera', 'emanuele.macera@protonmail.com', 'MCRMNL98P18D969S', '1998-09-18', 'Genova', 'Via Irmo Ferrari 153', '15060', 'San Cristoforo', 'AL', '3780641640', true, true, true, true, 'approved', '2026-01-03T12:13:50', '2026-01-03', '2026-01-03'),
    ('Michele', 'Cont', 'michele.cont@icloud.com', 'CNTMHL79T03L378H', '1979-12-03', 'Trento', 'Verdi', '38060', 'Aldeno', 'TN', '3481200623', true, true, true, true, 'approved', '2026-01-05T20:09:43', '2026-01-05', '2026-01-05'),
    ('Kevin', 'Bashaj', '04biscia@gmail.com', 'BSHKVN98H16H612C', '1998-06-16', 'Rovereto', 'Via Benacense 79, F', '38068', 'Rovereto', 'TN', '3498017574', true, true, true, true, 'approved', '2026-01-05T20:34:39', '2026-08-11', '2026-08-11'),
    ('Luigi', 'Mignogna', 'luigi.mignogna327@gmail.com', 'MGNLGU88C27L049W', '1988-03-27', 'Taranto', 'Viale J.F. Kennedy 50/a1', '00043', 'Ciampino', 'RM', '3208739687', true, true, true, true, 'approved', '2026-01-06T23:26:17', '2026-01-06', '2026-01-06'),
    ('Luca', 'Atanasio', 'lucaatanasio@gmail.com', 'TNSLCU96P10H612F', '1996-09-10', 'Rovereto', 'Via Raffaele zotti', '38068', 'Rovereto', 'TN', '3278966888', true, true, true, true, 'approved', '2026-01-18T18:34:00', '2026-02-09', '2026-02-09'),
    ('Davide', 'Resenterra', 'd.resenterra@yahoo.it', 'RSNDVD92P23L378L', '1992-09-23', 'Trento', 'Via Stefano Salterio 6', '38121', 'Trento', 'TN', '3456716712', true, true, true, true, 'approved', '2026-01-23T20:15:05', '2026-01-23', '2026-01-23'),
    ('Matteo', 'Carrai', 'merumeru98@live.it', 'CRRMTT98A03G702K', '1998-01-03', 'Pisa', 'Via Rovigo 75B', '39100', 'Bolzan', 'BZ', '3382145666', true, true, true, true, 'approved', '2026-01-23T20:29:16', '2026-01-23', '2026-01-23'),
    ('Mirko', 'Pizzini', 'mirkopizzini93@gmail.com', 'PZZMRK93H30H612Y', '1992-06-30', 'Rovereto', 'Via a toss 22', '38065', 'Mori', 'TN', '3338206922', true, true, true, true, 'approved', '2026-01-23T20:34:49', '2026-01-23', '2026-01-23'),
    ('Ivan', 'Falser', 'nibif92@gmail.com', 'FLSVNI92B25H612V', '1992-02-25', 'Rovereto', 'Via Nuova 67', '38061', 'Ala', 'TN', '3407824188', true, true, true, true, 'approved', '2026-01-23T20:36:06', '2026-01-23', '2026-01-23'),
    ('Pasquale', 'Acanfora', 'pasquale.acanfora20@gmail.com', 'CNFPQLP00P06A952J', '2000-09-06', 'Bolzano', 'Via Resia 80', '39100', 'Bolzano', 'TN', '3284830826', true, true, true, true, 'approved', '2026-01-25T15:45:14', '2026-01-22', '2026-01-22'),
    ('Renzo', 'Cont', 'renzovolpe80@gmail.com', 'CNTRNZ80R25L378Y', '1980-10-25', 'Treno', 'Via Marconi 10', '38060', 'Aldeno', 'TN', '3403138331', true, true, true, true, 'approved', '2026-02-01T17:46:55', '2026-02-02', '2026-02-02'),
    ('Christian', 'Meneghini', 'menego93@gmail.com', 'MNGCRS93L02A952I', '1993-07-02', 'Bolzano', 'Via Alessandria 48', '39100', 'Bolzano', 'BZ', '3295864362', true, true, true, true, 'approved', '2026-02-02T20:18:25', '2026-02-02', '2026-02-02'),
    ('Attilio', 'Guerra', 'attilioguerra94@gmail.com', 'GRRTTL94D10F704T', '1994-04-10', 'Monza', 'Via delle decime 4', '38030', 'Castello di Fiemme', 'TN', '3385057729', true, true, true, true, 'approved', '2026-02-12T20:05:01', '2026-02-12', '2026-02-12'),
    ('Ismaele', 'Tuffanelli', 'ismaele.tuffanelli@gmail.com', 'TFFSML92P25A952V', '1992-09-25', 'Bolzano', 'Via Bedovina 4/A', '38037', 'Predazzo', 'TN', '3663490998', true, true, true, true, 'approved', '2026-02-12T20:07:45', '2026-02-12', '2026-02-12'),
    ('Manuel', 'Rubino', 'manuelrubino00@gmail.com', 'RBNMNL98R19Z112G', '1998-10-19', 'Norimberga', 'Via caltrezza 7', '38038', 'Tesero', 'TN', '3920491761', true, true, true, true, 'approved', '2026-02-12T23:44:36', '2026-02-12', '2026-02-12'),
    ('Gianluca', 'Brunel', 'gianlucabrunel688@gmail.com', 'BRNGLC98C18L378R', '1998-03-18', 'Trento', 'Strada di troes 1, interno 8', '38035', 'Moena', 'TN', '3472871603', true, true, true, true, 'approved', '2026-02-12T23:46:22', '2026-02-12', '2026-02-12'),
    ('Stefan', 'Brunel', 'stefan.brunel@hotmail.it', 'BRNSFN98C18L378X', '1998-03-18', 'Trento', 'Strada', '38030', 'Soraga', 'TN', '3478066919', true, true, true, true, 'approved', '2026-02-12T23:49:00', '2026-02-12', '2026-02-12'),
    ('Francesco', 'Rigoni', 'francescorigoni22@gmail.com', 'RGNFNC01H22A703H', '2001-06-22', 'Bassano del Grappa', 'Viale Brenta 71', '36056', 'Tezze sul Brenta', 'VI', '3246274213', true, true, true, true, 'approved', '2026-02-17T15:00:11', '2026-02-17', '2026-02-17'),
    ('Raffaele', 'Sinani', 'raffaele.sinani@gmail.com', 'SNNRFL98P12H612W', '1998-09-12', 'Rovereto(TN)', 'Via Fontani 22', '38068', 'Rovereto', 'TN', '3452651259', true, true, true, true, 'approved', '2026-02-17T17:44:36', '2026-02-17', '2026-02-17'),
    ('Dario', 'Arpetta', 'darioarpetta@icloud.com', 'RPTDRA90P24F839B', '1990-09-24', 'Napoli', 'Viale dei tigli', '38066', 'Riva del garda', 'TN', '3284182865', true, true, true, true, 'approved', '2026-02-17T20:26:59', '2026-02-20', '2026-02-20'),
    ('Andrea', 'Nicolodi', 'andreanicolodi@icloud.com', 'NCLNDR98S17H612U', '1998-11-17', 'Rovereto', 'Via Montecorona 25', '38060', 'Nomi', 'TN', '3427457623', true, true, true, true, 'approved', '2026-02-18T12:59:22', '2026-02-17', '2026-02-17'),
    ('Matteo', 'Moscatelli', 'matteomoscatelli@hotmail.it', 'MSCMTT98P20H612T', '1998-09-20', 'Rovereto, TN', 'Via riccardo zandonai 2a', '38060', 'Villa Lagarina', 'TN', '3468063831', true, true, true, true, 'approved', '2026-02-19T14:36:01', '2026-02-19', '2026-02-19'),
    ('Federico', 'Cazzaniga', 'fedec91@yahoo.it', 'CZZFRC91E15H330B', '1991-05-15', 'Riva del garda', 'Via cerere 29', '38062', 'Arco', 'TN', '3928952190', true, true, true, true, 'approved', '2026-02-19T20:02:49', '2026-02-19', '2026-02-19'),
    ('Paolo', 'Scaglione', 'paolosca2012@gmail.com', 'SCGPLA02T20M052N', '2002-12-20', 'Vimercate (MB)', 'Via del Praol 38', '38123', 'Sopramonte', 'TN', '3283598277', true, true, true, true, 'approved', '2026-02-19T20:10:18', '2026-02-19', '2026-02-19'),
    ('Aurelio', 'Varchetta', 'obgoblin.reaper@googlemail.com', 'VRCRLA93E13H501K', '1993-05-13', 'ROMA', 'VIA BRESCIA, 41', '38122', 'TRENTO', 'TN', '3405215673', true, true, true, true, 'approved', '2026-02-20T15:49:52', '2026-04-08', '2026-04-08'),
    ('Diego Mauricio', 'Romero Devia', 'merme_92@icloud.com', 'RMRDMR92C16Z603B', '1992-03-16', 'Coquimbo Cile', 'Via Milano 11', '38074', 'Pietramurata', 'TN', '3457378153', true, true, true, true, 'approved', '2026-02-20T20:15:25', '2026-02-20', '2026-02-20'),
    ('Niccolò', 'Caranti', 'ncaranti@gmail.com', 'CRNNCL86T24L378J', '1986-12-24', 'Trento', 'Via Ronchi 11', '38049', 'Altopiano della Vigolana', 'TN', '3898004456', true, true, true, true, 'approved', '2026-02-20T20:22:07', '2026-02-20', '2026-02-20'),
    ('Riccardo', 'Ghidoni', 'riccardo.ghidoni@gmail.com', 'GHDRCR86B18L378B', '1986-02-18', 'Trento', 'Via A. Spinelli 9', '40017', 'San Giovanni in Persiceto', 'BO', '3471399525', true, true, true, true, 'approved', '2026-02-20T20:41:17', '2026-02-20', '2026-02-20'),
    ('Marco', 'D''Alessio', 'marco.dalessio82@gmail.com', 'DLSMRC82C12A345E', '1982-03-12', 'L''Aquila', 'VIA gabriele d''annunzio 21', '67100', 'L''Aquila', 'AQ', '3404692464', true, true, true, true, 'approved', '2026-03-10T23:33:05', '2026-03-10', '2026-03-10'),
    ('Manuel', 'Manea', 'manuel.manea17@gmail.com', 'MNAMNL06A03L157T', '2006-01-03', 'Thiene', 'Via riva del cristo 2', '36015', 'Schio', 'VI', '344 285 5654', true, true, true, true, 'approved', '2026-03-17T12:23:21', '2026-03-16', '2026-03-16'),
    ('Giorgio', 'Bindella', 'giorgiobindella98@gmail.com', 'BNDGRG98H17D940D', '1998-06-17', 'Gavardo (BS)', 'Fontane 14', '25083', 'Gardone Riviera', 'BS', '333 5912202', true, true, true, true, 'approved', '2026-03-18T23:13:41', '2026-03-20', '2026-03-20'),
    ('Francesco', 'Perugini', 'peruginifrancesco95@gmail.com', 'PRGFNC95T22H612H', '1995-12-22', 'Rovereto', 'Via F.Anderle', '38060', 'Volano', 'TN', '3471937600', true, true, true, true, 'approved', '2026-03-19T12:25:56', '2026-03-18', '2026-03-18'),
    ('Federico', 'Agostini', 'agostini94@live.it', 'GSTFRC94C17L378Y', '1994-03-17', 'Trento', 'Via rupe 3', '38017', 'Mezzolombardo', 'TN', '3450336822', true, true, true, true, 'approved', '2026-03-20T00:28:41', null, null),
    ('Andrea', 'Germiniasi', 'germiniasiandrea.ita@gmail.com', 'GRMNDR03A04B898T', '2003-01-04', 'Casalmaggiore', 'Via Segrè 12', '46012', 'Bozzolo', 'MN', '3703033539', true, true, true, true, 'approved', '2026-03-20T20:15:02', '2026-03-20', '2026-03-20'),
    ('Romeo', 'Graifenberg', 'romeo.graifenberg@gmail.com', 'GRFRMO84L01C794C', '1984-07-01', 'Cles', 'Via 4 novembre 41', '38012', 'Predaia', 'TN', '3482656431', true, true, true, true, 'approved', '2026-03-20T20:15:39', '2026-03-20', '2026-03-20'),
    ('Leda', 'Sangiorgio', 'ledasangiorgio@gmail.com', 'SNGLDE84L66F023V', '1984-07-26', 'Massa', 'Via 4 Novembre 41', '38012', 'Predaia', 'TN', '3385013358', true, true, true, true, 'approved', '2026-03-20T20:21:32', '2026-03-20', '2026-03-20'),
    ('Luca', 'Foltran', 'luca.foltran@gmail.com', 'FLTLCU92C09M089J', '1992-03-09', 'Vittorio Veneto', 'Via G.Mazzini 62', '31029', 'Vittorio Veneto', 'TV', '3801061543', true, true, true, true, 'approved', '2026-04-02T17:42:01', null, null),
    ('Damir Ettore', 'Rolle', 'masticore.personale@gmail.com', 'RLLDRT88T18A345C', '1988-10-18', 'L''Aquil', 'Via Francesco paolo tosti 37', '67100', 'L''Aquila', 'AQ', '3351633309', true, true, true, true, 'approved', '2026-04-14T17:28:09', '2026-04-14', '2026-04-14'),
    ('Luca', 'Banita', 'lucaban23@gmail.com', 'BNTLNT01S23L949B', '2001-11-23', 'Villafranca di Verona', 'Via don Lorenzo Guetti 7', '38121', 'Trento', 'TN', '3498204533', true, true, true, true, 'approved', '2025-12-16T15:15:16', null, null),
    ('Gabriele', 'Gialdi', 'gialdi.gabriele@gmail.com', 'GLDGRL99L23E253S', '1999-07-23', 'Guastalla', 'Via L. Cerati 21', '46030', 'Dosolo', 'MN', '3396768715', true, true, true, true, 'approved', '2026-04-16T20:00:20', '2026-04-16', '2026-04-16'),
    ('Lorenzo', 'Fimognari', 'lorenzo.fimognari@gmail.com', 'FMGLNZ88B27L378E', '1988-02-27', 'Trento', 'Via ai comuni 14', '38123', 'Trento', 'TN', '3319974530', true, true, true, true, 'approved', '2026-04-21T20:17:45', '2026-04-21', '2026-04-21'),
    ('Gianluca', 'Lopez', 'gianlucalop@gmail.com', 'LPZGLC86T02F839Q', '1986-12-02', 'Napoli', 'Strada delle tabarelle', '38123', 'Trento', 'TN', '3913478278', true, true, true, true, 'approved', '2026-04-24T20:12:28', '2026-04-24', '2026-04-24'),
    ('Emanuele', 'Di Bella', 'emanuele.db4@gmail.com', 'DBLMNL99A22C351D', '1999-01-22', 'Catania', 'Via Campo Sportivo 14b', '95030', 'Mascalucia', 'CT', '3338386592', true, true, true, true, 'approved', '2026-04-24T20:12:43', '2026-04-24', '2026-04-24'),
    ('Elia', 'Zeni', 'mzeni59@gmail.com', 'ZNELEI01H05C372W', '2001-06-05', 'Cavalese', 'Località val 19', '38038', 'Tesero', 'TN', '3661342961', true, true, true, true, 'approved', '2026-05-08T07:52:59', '2026-05-07', '2026-05-07'),
    ('Rodolfo', 'Giulianini', 'rodolfogiulianini@gmail.com', 'GLNRLF78S03I690T', '1978-11-03', 'Sesto San Giovanni', 'Via roda,2', '38030', 'Ziano di fiemme', 'TN', '3921799994', true, true, true, true, 'approved', '2026-05-12T22:41:54', '2026-05-13', '2026-05-13'),
    ('Federico', 'Favilli', 'fedefav04@gmail.com', 'FVLFRC04L08L157K', '2004-07-08', 'Thiene, VI', 'Via IV Novembre, 100', '38121', 'Trento', 'TN', '3425696892', true, true, true, true, 'approved', '2026-05-16T22:23:09', null, null),
    ('Marcello', 'Marasà', 'elmarci91@gmail.com', null, '1991-05-06', 'Piacenza', 'Piacenza', '29121', 'Piacenza', 'PC', '3518028923', true, true, true, true, 'approved', '2026-05-21T17:01:46', '2026-05-21', '2026-05-21'),
    ('Edoardo', 'Barbieri', 'edoardobarbieri17@gmail.com', 'BBRDRD03B17D612Z', '2003-02-17', 'Firenze', 'Via Guglielmo Marconi 12', '50131', 'Firenze', 'FI', '3347923193', true, true, true, true, 'approved', '2026-05-21T19:52:38', '2026-05-21', '2026-05-21'),
    ('Lorenzo', 'Marocchi', 'lorenzo.marocchi@gmail.com', 'MRCLNZ94P12H330S', '1994-09-12', 'Riva del Garda', 'Piazzetta San Valentino, 1', '38123', 'Sopramonte', 'TN', '3485793135', true, true, true, true, 'approved', '2026-05-22T21:24:50', '2026-05-22', '2026-05-22'),
    ('Enrico', 'Micheloni', 'micene.sagitter@hotmail.it', 'MCHNRC88P02L378J', '1988-09-30', 'Trento', 'Via Grezzi 2', '38049', 'Altopiano della Vigolana', 'TN', '3299340209', true, true, true, true, 'approved', '2026-05-30T10:19:54', '2026-05-30', '2026-05-30'),
    ('Nicola', 'Divan', 'nicola.divan@gmail.com', 'DVNNCL94P02L378Y', '1994-02-09', 'Trento', 'Via Flavio Gioia 5', '20149', 'Milan', 'MI', '3490553433', true, true, true, true, 'approved', '2026-05-30T10:20:37', '2026-05-30', '2026-05-30'),
    ('Saverio', 'Cattani', 'saveriocattani@yahoo.it', 'CTTSVR76E13F187X', '1976-05-13', 'Mezzolombardo', 'via San Bernardino 15', '38122', 'Trento', 'TN', '3497776577', true, true, true, true, 'approved', '2026-05-30T10:33:17', '2026-05-30', '2026-05-30'),
    ('Davide', 'Valduga', 'dade89@gmail.com', 'VODDVD89D30H612H', '1989-04-30', 'Rovereto', 'Spiazze 32', '38060', 'Volano', 'TN', '3284912748', true, true, true, true, 'approved', '2026-05-30T14:59:08', '2026-05-30', '2026-05-30'),
    ('Mattia', 'Barile', 'barilemattia00@gmail.com', 'BRLMTT00L11H501O', '2000-07-11', 'Roma', 'Via A. Gramsci E 58', '30035', 'Mirano', 'VE', '3317836161', true, true, true, true, 'approved', '2026-05-30T15:13:44', '2026-05-30', '2026-05-30'),
    ('Davide', 'Minello', 'dabba.games@icloud.com', 'MNLDVD00P03L736E', '2000-09-03', 'Venezia', 'Via miranese 13', '30035', 'Mirano', 'VE', '3703284131', true, true, true, true, 'approved', '2026-05-30T15:14:22', '2026-05-30', '2026-05-30'),
    ('Michele', 'Grandi', 'michelegrandi@gmail.com', 'GRNMHL81L25H612D', '1981-07-25', 'Rovereto', 'Via Zandonai, 53', '38060', 'Villa Lagarina', 'TN', '3331820141', true, true, true, true, 'approved', '2026-06-01T13:55:58', '2026-05-30', '2026-05-30'),
    ('Giovanni', 'Zeni', 'giogiova9@gmail.com', 'ZNEGNN99P06B296G', '1999-09-06', 'Bussolengo', 'Corso Michelangelo Buonarroti', '38122', 'Trento', 'TN', '3317660612', true, true, true, true, 'approved', '2026-06-02T12:13:06', '2026-05-30', '2026-05-30'),
    ('Luca', 'Zanon', 'lucazanon1993@gmail.com', 'ZNNLCU93H15C372M', '1993-06-15', 'Cavalese', 'Via zanon 1', '38030', 'Ziano di fiemme', 'TN', '3485755826', true, true, true, true, 'approved', '2026-06-15T10:39:37', '2026-06-18', '2026-06-18'),
    ('Mirko', 'Atanasio', 'atanasio.mirko@gmail.com', 'TNSMRK89P19H612U', '1989-09-19', 'Rovereto', 'Via Leonardo da Vinci, 96', '38068', 'Rovereto', 'TN', '3202117540', true, true, true, true, 'approved', '2026-06-23T20:36:36', '2026-06-23', '2026-06-23'),
    ('Thomas', 'Faes', 'thomasin24@gmail.com', 'FSATMS82S09L378D', '1982-11-09', 'Trento', 'Via di arbor 2/b', '38010', 'SANZENO', 'TN', '3408951931', true, true, true, true, 'approved', '2026-07-28T18:51:26', '2026-07-28', '2026-07-28'),
    ('Pietro', 'Zandonai', 'zandonai.pietro@gmail.com', 'ZNDPTR90R29H612N', '1990-10-29', 'Rovereto', 'Via Bosco di Noriglio 49', '38068', 'Rovereto', 'TN', '3494620360', true, true, true, true, 'approved', '2026-07-30T20:40:12', '2026-07-30', '2026-07-30'),
    ('Luca', 'Pompermaier', 'chalcopyrite@yahoo.com', 'PMPLCU91A29H612Y', '1991-01-29', 'Rovereto', 'Frazione Covelo 108', '38060', 'Cimone', 'TN', '3474618788', true, true, true, true, 'approved', '2026-07-30T20:40:17', '2026-07-30', '2026-07-30'),
    ('Eric', 'Vicentini', 'ericvice91@gmail.com', 'VCNRCE91C15H612X', '1991-03-15', 'Rovereto', 'Corso Bettini 50', '38068', 'Rovereto', 'TN', '3402656645', true, true, true, true, 'approved', '2026-08-04T10:03:35', '2026-07-30', '2026-07-30'),
    ('Leonardo', 'Russo', 'leoruss0902@gmail.com', 'RSSLRD02P14L378Q', '2002-09-14', 'Trento', 'Via di Melta, 79', '38121', 'Trento', 'TN', '3311562736', true, true, true, true, 'approved', '2026-08-11T16:34:50', null, null);

insert into public.pauperwave_associate_renewals (associate_uuid, renewal_year, renewal_date)
values
  ((select uuid from public.pauperwave_associates where email_address = 'filippo.ghidoni89@gmail.com'), extract(year from '2026-02-20'::date)::smallint, '2026-02-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'gabriele.divan@gmail.com'), extract(year from '2026-01-22'::date)::smallint, '2026-01-22'),
  ((select uuid from public.pauperwave_associates where email_address = 'emn.crb@gmail.com'), extract(year from '2026-01-23'::date)::smallint, '2026-01-23'),
  ((select uuid from public.pauperwave_associates where email_address = 'federico.covi@gmail.com'), extract(year from '2026-02-12'::date)::smallint, '2026-02-12'),
  ((select uuid from public.pauperwave_associates where email_address = 'sonn.m@hotmail.it'), extract(year from '2026-02-20'::date)::smallint, '2026-02-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'francesco.mariotti.tn@gmail.com'), extract(year from '2026-04-28'::date)::smallint, '2026-04-28'),
  ((select uuid from public.pauperwave_associates where email_address = 'giuliagrillini@gmail.com'), extract(year from '2026-02-19'::date)::smallint, '2026-02-19'),
  ((select uuid from public.pauperwave_associates where email_address = 'jackemall@hotmail.it'), extract(year from '2026-05-07'::date)::smallint, '2026-05-07'),
  ((select uuid from public.pauperwave_associates where email_address = 'titozoppello@gmail.com'), extract(year from '2026-01-02'::date)::smallint, '2026-01-02'),
  ((select uuid from public.pauperwave_associates where email_address = 'emanuele.macera@protonmail.com'), extract(year from '2026-01-03'::date)::smallint, '2026-01-03'),
  ((select uuid from public.pauperwave_associates where email_address = 'michele.cont@icloud.com'), extract(year from '2026-01-05'::date)::smallint, '2026-01-05'),
  ((select uuid from public.pauperwave_associates where email_address = '04biscia@gmail.com'), extract(year from '2026-08-11'::date)::smallint, '2026-08-11'),
  ((select uuid from public.pauperwave_associates where email_address = 'luigi.mignogna327@gmail.com'), extract(year from '2026-01-06'::date)::smallint, '2026-01-06'),
  ((select uuid from public.pauperwave_associates where email_address = 'lucaatanasio@gmail.com'), extract(year from '2026-02-09'::date)::smallint, '2026-02-09'),
  ((select uuid from public.pauperwave_associates where email_address = 'd.resenterra@yahoo.it'), extract(year from '2026-01-23'::date)::smallint, '2026-01-23'),
  ((select uuid from public.pauperwave_associates where email_address = 'merumeru98@live.it'), extract(year from '2026-01-23'::date)::smallint, '2026-01-23'),
  ((select uuid from public.pauperwave_associates where email_address = 'mirkopizzini93@gmail.com'), extract(year from '2026-01-23'::date)::smallint, '2026-01-23'),
  ((select uuid from public.pauperwave_associates where email_address = 'nibif92@gmail.com'), extract(year from '2026-01-23'::date)::smallint, '2026-01-23'),
  ((select uuid from public.pauperwave_associates where email_address = 'pasquale.acanfora20@gmail.com'), extract(year from '2026-01-22'::date)::smallint, '2026-01-22'),
  ((select uuid from public.pauperwave_associates where email_address = 'renzovolpe80@gmail.com'), extract(year from '2026-02-02'::date)::smallint, '2026-02-02'),
  ((select uuid from public.pauperwave_associates where email_address = 'menego93@gmail.com'), extract(year from '2026-02-02'::date)::smallint, '2026-02-02'),
  ((select uuid from public.pauperwave_associates where email_address = 'attilioguerra94@gmail.com'), extract(year from '2026-02-12'::date)::smallint, '2026-02-12'),
  ((select uuid from public.pauperwave_associates where email_address = 'ismaele.tuffanelli@gmail.com'), extract(year from '2026-02-12'::date)::smallint, '2026-02-12'),
  ((select uuid from public.pauperwave_associates where email_address = 'manuelrubino00@gmail.com'), extract(year from '2026-02-12'::date)::smallint, '2026-02-12'),
  ((select uuid from public.pauperwave_associates where email_address = 'gianlucabrunel688@gmail.com'), extract(year from '2026-02-12'::date)::smallint, '2026-02-12'),
  ((select uuid from public.pauperwave_associates where email_address = 'stefan.brunel@hotmail.it'), extract(year from '2026-02-12'::date)::smallint, '2026-02-12'),
  ((select uuid from public.pauperwave_associates where email_address = 'francescorigoni22@gmail.com'), extract(year from '2026-02-17'::date)::smallint, '2026-02-17'),
  ((select uuid from public.pauperwave_associates where email_address = 'raffaele.sinani@gmail.com'), extract(year from '2026-02-17'::date)::smallint, '2026-02-17'),
  ((select uuid from public.pauperwave_associates where email_address = 'darioarpetta@icloud.com'), extract(year from '2026-02-20'::date)::smallint, '2026-02-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'andreanicolodi@icloud.com'), extract(year from '2026-02-17'::date)::smallint, '2026-02-17'),
  ((select uuid from public.pauperwave_associates where email_address = 'matteomoscatelli@hotmail.it'), extract(year from '2026-02-19'::date)::smallint, '2026-02-19'),
  ((select uuid from public.pauperwave_associates where email_address = 'fedec91@yahoo.it'), extract(year from '2026-02-19'::date)::smallint, '2026-02-19'),
  ((select uuid from public.pauperwave_associates where email_address = 'paolosca2012@gmail.com'), extract(year from '2026-02-19'::date)::smallint, '2026-02-19'),
  ((select uuid from public.pauperwave_associates where email_address = 'obgoblin.reaper@googlemail.com'), extract(year from '2026-04-08'::date)::smallint, '2026-04-08'),
  ((select uuid from public.pauperwave_associates where email_address = 'merme_92@icloud.com'), extract(year from '2026-02-20'::date)::smallint, '2026-02-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'ncaranti@gmail.com'), extract(year from '2026-02-20'::date)::smallint, '2026-02-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'riccardo.ghidoni@gmail.com'), extract(year from '2026-02-20'::date)::smallint, '2026-02-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'marco.dalessio82@gmail.com'), extract(year from '2026-03-10'::date)::smallint, '2026-03-10'),
  ((select uuid from public.pauperwave_associates where email_address = 'manuel.manea17@gmail.com'), extract(year from '2026-03-16'::date)::smallint, '2026-03-16'),
  ((select uuid from public.pauperwave_associates where email_address = 'giorgiobindella98@gmail.com'), extract(year from '2026-03-20'::date)::smallint, '2026-03-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'peruginifrancesco95@gmail.com'), extract(year from '2026-03-18'::date)::smallint, '2026-03-18'),
  ((select uuid from public.pauperwave_associates where email_address = 'germiniasiandrea.ita@gmail.com'), extract(year from '2026-03-20'::date)::smallint, '2026-03-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'romeo.graifenberg@gmail.com'), extract(year from '2026-03-20'::date)::smallint, '2026-03-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'ledasangiorgio@gmail.com'), extract(year from '2026-03-20'::date)::smallint, '2026-03-20'),
  ((select uuid from public.pauperwave_associates where email_address = 'masticore.personale@gmail.com'), extract(year from '2026-04-14'::date)::smallint, '2026-04-14'),
  ((select uuid from public.pauperwave_associates where email_address = 'gialdi.gabriele@gmail.com'), extract(year from '2026-04-16'::date)::smallint, '2026-04-16'),
  ((select uuid from public.pauperwave_associates where email_address = 'lorenzo.fimognari@gmail.com'), extract(year from '2026-04-21'::date)::smallint, '2026-04-21'),
  ((select uuid from public.pauperwave_associates where email_address = 'gianlucalop@gmail.com'), extract(year from '2026-04-24'::date)::smallint, '2026-04-24'),
  ((select uuid from public.pauperwave_associates where email_address = 'emanuele.db4@gmail.com'), extract(year from '2026-04-24'::date)::smallint, '2026-04-24'),
  ((select uuid from public.pauperwave_associates where email_address = 'mzeni59@gmail.com'), extract(year from '2026-05-07'::date)::smallint, '2026-05-07'),
  ((select uuid from public.pauperwave_associates where email_address = 'rodolfogiulianini@gmail.com'), extract(year from '2026-05-13'::date)::smallint, '2026-05-13'),
  ((select uuid from public.pauperwave_associates where email_address = 'elmarci91@gmail.com'), extract(year from '2026-05-21'::date)::smallint, '2026-05-21'),
  ((select uuid from public.pauperwave_associates where email_address = 'edoardobarbieri17@gmail.com'), extract(year from '2026-05-21'::date)::smallint, '2026-05-21'),
  ((select uuid from public.pauperwave_associates where email_address = 'lorenzo.marocchi@gmail.com'), extract(year from '2026-05-22'::date)::smallint, '2026-05-22'),
  ((select uuid from public.pauperwave_associates where email_address = 'micene.sagitter@hotmail.it'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'nicola.divan@gmail.com'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'saveriocattani@yahoo.it'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'dade89@gmail.com'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'barilemattia00@gmail.com'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'dabba.games@icloud.com'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'michelegrandi@gmail.com'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'giogiova9@gmail.com'), extract(year from '2026-05-30'::date)::smallint, '2026-05-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'lucazanon1993@gmail.com'), extract(year from '2026-06-18'::date)::smallint, '2026-06-18'),
  ((select uuid from public.pauperwave_associates where email_address = 'atanasio.mirko@gmail.com'), extract(year from '2026-06-23'::date)::smallint, '2026-06-23'),
  ((select uuid from public.pauperwave_associates where email_address = 'thomasin24@gmail.com'), extract(year from '2026-07-28'::date)::smallint, '2026-07-28'),
  ((select uuid from public.pauperwave_associates where email_address = 'zandonai.pietro@gmail.com'), extract(year from '2026-07-30'::date)::smallint, '2026-07-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'chalcopyrite@yahoo.com'), extract(year from '2026-07-30'::date)::smallint, '2026-07-30'),
  ((select uuid from public.pauperwave_associates where email_address = 'ericvice91@gmail.com'), extract(year from '2026-07-30'::date)::smallint, '2026-07-30')
on conflict (associate_uuid, renewal_year) do nothing;
