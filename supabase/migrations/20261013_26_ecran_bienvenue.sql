-- =====================================================================
-- MIGRATION 26 — Écran de bienvenue : date à laquelle le couple l'a terminé ou passé.
-- Tant que la colonne est vide, le tableau de bord affiche la bienvenue (une seule fois par couple,
-- et non plus à chaque visite tant que la liste d'invités est vide).
-- Les couples qui ont déjà au moins un invité sont considérés comme accueillis : ils ne la verront pas.
-- Sans risque (ajout uniquement). Relançable.
-- =====================================================================

alter table public.marriages add column if not exists onboarded_at timestamptz;

update public.marriages m
set onboarded_at = coalesce(m.created_at, now())
where m.onboarded_at is null
  and exists (select 1 from public.invite i where i.marriage_id = m.id);
