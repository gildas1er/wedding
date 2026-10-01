-- =====================================================================
-- MIGRATION 9 — Checklist : notes, personne en charge et date de réalisation.
-- Sans danger : n'ajoute que des colonnes facultatives (les tâches existantes sont conservées).
-- =====================================================================

alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists assigned_to text;
alter table public.tasks add column if not exists completed_at timestamptz;

comment on column public.tasks.notes is 'Notes libres (contacts, prix, pièces à fournir…)';
comment on column public.tasks.assigned_to is 'Qui s''en charge : les mariés, la famille, un témoin…';
comment on column public.tasks.completed_at is 'Date à laquelle la tâche a été cochée';

-- Les tâches terminées avant cette migration n'ont pas de date : on prend leur date de création
update public.tasks set completed_at = created_at where is_completed and completed_at is null;
