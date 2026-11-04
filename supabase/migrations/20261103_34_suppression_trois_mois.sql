-- =====================================================================
-- MIGRATION 34 — Nouvelle règle après le mariage.
--   - Espace complet jusqu'à J+1 mois (inchangé), puis mode souvenir 2 mois,
--     suppression à J+3 mois (au lieu de J+12 mois). Règle dans lib/lifecycle.ts.
--   - Deux e-mails envoyés par la tâche de nuit (/api/cron/purge) :
--       souvenir_email_at : « Vos souvenirs vous attendent » (passage en mode souvenir) ;
--       final_reminder_at : dernier rappel, 3 jours avant la suppression.
--     Aucun espace n'est supprimé tant que le dernier rappel n'est pas parti.
--   - Transition : les espaces dont la suppression tomberait dans moins de 30 jours
--     (ou serait déjà passée) gardent 30 jours à partir de cette migration (delete_after).
--     Les prolongations payées (kept_until) sont conservées.
--   À lancer juste avant de déployer la nouvelle version. À lancer après la 33.
-- =====================================================================

alter table public.marriages
  add column if not exists delete_after timestamptz,
  add column if not exists souvenir_email_at timestamptz,
  add column if not exists final_reminder_at timestamptz;

-- Transition de 30 jours (une seule fois : ne touche pas un espace déjà traité)
update public.marriages
   set delete_after = now() + interval '30 days'
 where delete_after is null
   and wedding_date is not null
   and (wedding_date::date + interval '3 months') < now() + interval '30 days'
   and (kept_until is null or kept_until < now() + interval '30 days');

-- Ces colonnes sont gérées par le serveur : un couple ne peut pas repousser sa suppression lui-même
-- (kept_until est déjà protégée par la migration 13)
create or replace function public.protect_marriage_lifecycle()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_privileged_writer() then
    new.delete_after := old.delete_after;
    new.souvenir_email_at := old.souvenir_email_at;
    new.final_reminder_at := old.final_reminder_at;
  end if;
  return new;
end;
$$;

drop trigger if exists marriages_protect_lifecycle on public.marriages;
create trigger marriages_protect_lifecycle
  before update on public.marriages
  for each row execute function public.protect_marriage_lifecycle();
