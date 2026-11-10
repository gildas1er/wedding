-- =====================================================================
-- MIGRATION 36 — Deux modèles de plus pour les cartes de remerciements :
--   « generique » (Le Générique de fin) et « statut » (Le Statut, format statut WhatsApp).
--   table_roles : le rôle amusant de chaque table dans le générique, choisi par le couple
--   ({ "<id de la table>": "Les ambianceurs", … }).
--   À lancer après la 35.
-- =====================================================================

alter table public.thanks_settings drop constraint if exists thanks_settings_template_check;
alter table public.thanks_settings
  add constraint thanks_settings_template_check check (template in ('lettre', 'souvenir', 'generique', 'statut'));

alter table public.thanks_settings add column if not exists table_roles jsonb not null default '{}'::jsonb;
alter table public.thanks_settings drop constraint if exists thanks_settings_table_roles_check;
alter table public.thanks_settings
  add constraint thanks_settings_table_roles_check check (jsonb_typeof(table_roles) = 'object' and length(table_roles::text) <= 8000);
