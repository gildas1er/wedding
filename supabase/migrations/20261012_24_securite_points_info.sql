-- =====================================================================
-- MIGRATION 24 — Sécurité : points d'information de l'audit du 12 octobre 2026 (10.1 et 10.2).
--   10.1 La limite d'invités d'un mariage (et donc son palier payé) n'est plus lisible par les visiteurs :
--        marriage_guest_quota ne sert qu'au contrôle interne de la base (déclencheur des invités).
--   10.2 La page d'inscription retrouve les prénoms du couple parrain à partir de son code : au plus
--        30 vérifications par adresse IP et par heure, pour empêcher d'essayer des codes en série.
-- À lancer APRÈS la migration 23 (compteur d'essais). Relançable.
-- =====================================================================

-- 10.1 Fonction interne : plus aucun appel direct (le déclencheur l'utilise avec les droits du propriétaire)
revoke all on function public.marriage_guest_quota(uuid) from public, anon, authenticated;

-- 10.2 Prénoms du couple parrain, avec limite d'essais (null quand la limite est atteinte : pas de bandeau)
create or replace function public.referral_inviter(p_code text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_key text := 'parrain:' || public.request_ip();
  v_names text;
begin
  if public.rate_count(v_key, interval '1 hour') >= 30 then
    return null;
  end if;
  perform public.rate_hit(v_key);
  select coalesce(partner_1_name, '') || ' & ' || coalesce(partner_2_name, '') into v_names
  from public.marriages where referral_code = upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
  return v_names;
end;
$$;
revoke all on function public.referral_inviter(text) from public;
grant execute on function public.referral_inviter(text) to anon, authenticated;
