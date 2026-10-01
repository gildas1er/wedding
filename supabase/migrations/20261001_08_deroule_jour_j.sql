-- =====================================================================
-- MIGRATION 8 — Déroulé du Jour J : heure de fin et responsable de chaque moment.
-- Sans danger : n'ajoute que des colonnes facultatives (les moments existants sont conservés).
-- =====================================================================

alter table public.planning_events add column if not exists end_time time;
alter table public.planning_events add column if not exists responsible text;
alter table public.planning_events add column if not exists responsible_contact text;

comment on column public.planning_events.end_time is 'Heure de fin (facultative)';
comment on column public.planning_events.responsible is 'Qui s''en occupe : maître de cérémonie, DJ, traiteur…';
comment on column public.planning_events.responsible_contact is 'Téléphone ou e-mail du responsable';
