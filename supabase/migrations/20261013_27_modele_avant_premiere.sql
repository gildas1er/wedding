-- =====================================================================
-- MIGRATION 27 — Nouveau modèle d'invitation « L'Avant-première » (façon plateforme de séries).
-- Ajoute « avant_premiere » aux modèles autorisés. Sans risque (les choix existants restent valides). Relançable.
-- =====================================================================

alter table public.marriages drop constraint if exists marriages_invitation_template_check;
alter table public.marriages add constraint marriages_invitation_template_check
  check (invitation_template in ('classique', 'enveloppe', 'wax', 'story', 'compte_a_rebours', 'jardin', 'nuit_doree', 'avant_premiere'));
