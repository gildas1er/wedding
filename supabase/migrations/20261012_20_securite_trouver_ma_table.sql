-- =====================================================================
-- MIGRATION 20 — Sécurité : « Trouver ma table » ne renvoie plus l'identifiant des invités.
-- Problème corrigé (audit de sécurité du 12 octobre 2026, constat 1) :
--   find_guest_table, ouverte à tous, renvoyait l'identifiant de chaque invité. Cet identifiant est
--   aussi la clé du lien d'invitation personnel (/rsvp/<mariage>?guest=<id>). Avec un seul lien,
--   n'importe qui pouvait donc lister les invités, lire leurs notes et modifier leurs réponses.
-- Désormais : seulement le nom, le nombre de couverts et la table ; 3 lettres minimum.
-- Les liens d'invitation déjà envoyés restent valables. Sans risque, relançable.
-- À lancer APRÈS le déploiement du code (la page n'utilise plus l'identifiant).
-- =====================================================================

-- Le type de retour change : il faut supprimer l'ancienne version
drop function if exists public.find_guest_table(uuid, text);

create function public.find_guest_table(p_marriage_id uuid, p_query text)
returns table (name text, guests_count int, table_name text)
language sql stable security definer set search_path = public
as $$
  select i.name, coalesce(i.guests_count, 1), t.name
  from public.invite i
  left join public.tables t on t.id = i.table_id
  where i.marriage_id = p_marriage_id
    and char_length(trim(coalesce(p_query, ''))) >= 3
    and i.name ilike '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by i.name
  limit 5;
$$;

revoke all on function public.find_guest_table(uuid, text) from public;
grant execute on function public.find_guest_table(uuid, text) to anon, authenticated;
