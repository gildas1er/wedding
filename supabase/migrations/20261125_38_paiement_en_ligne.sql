-- =====================================================================
-- MIGRATION 38 — Paiement en ligne des paliers (SasPay)
--   Chaque paiement en ligne garde le palier acheté, les frais retenus par SasPay et le moyen utilisé
--   (ex : « wave_ci »). Les paiements manuels (WhatsApp) ne changent pas.
--   Sans risque (ajouts uniquement). Relançable. À lancer après la 37.
-- =====================================================================

alter table public.payments add column if not exists tier text;
alter table public.payments add column if not exists fee integer;
alter table public.payments add column if not exists method text;

alter table public.payments drop constraint if exists payments_fee_check;
alter table public.payments add constraint payments_fee_check check (fee is null or fee >= 0);
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check (method is null or char_length(method) <= 40);

-- Recherche des paiements en ligne en attente (notifications SasPay)
create index if not exists payments_provider_status_idx on public.payments (provider, status, created_at desc);
