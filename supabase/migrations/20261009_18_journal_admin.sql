-- =====================================================================
-- MIGRATION 18 — Journal des actions de l'administration (/admin).
-- Chaque activation de palier, prolongation, désactivation ou suppression y est notée.
-- Lecture et écriture réservées au serveur (clé service) : aucune règle d'accès pour les couples.
-- Sans risque (ajout uniquement). À lancer après la migration 17.
-- =====================================================================

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_email text not null,
  marriage_id uuid,            -- conservé même après suppression du couple (pas de clé étrangère)
  couple text,
  action text not null,        -- palier, gratuit, prolongation, desactivation, reactivation, suppression
  details jsonb
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;

-- Paiements encaissés à la main (appel / WhatsApp) : enregistrés par l'administration dans « payments »
-- avec provider = 'manuel'. Les paiements d'un couple supprimé restent en comptabilité.
alter table public.payments drop constraint if exists payments_marriage_id_fkey;
alter table public.payments add column if not exists couple text;
alter table public.payments add column if not exists note text;
