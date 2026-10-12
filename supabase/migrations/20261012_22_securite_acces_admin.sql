-- =====================================================================
-- MIGRATION 22 — Sécurité : l'accès à l'administration se donne compte par compte.
-- Problème corrigé (audit de sécurité du 12 octobre 2026, constat 3) :
--   l'administration s'ouvrait à toute session dont l'e-mail figurait dans ADMIN_EMAILS. La confirmation
--   des e-mails étant désactivée, quelqu'un pouvait créer un compte avec une adresse d'administrateur
--   pas encore inscrite et obtenir toute l'administration.
-- Désormais il faut AUSSI le marqueur « admin » dans les métadonnées app du compte (app_metadata),
-- que seul ce SQL Editor peut écrire. Un utilisateur ne peut jamais se le donner lui-même.
--
-- APRÈS avoir lancé cette migration et déployé le code :
--   1. Vérifiez vos comptes administrateurs :
--        select email, created_at, last_sign_in_at, raw_app_meta_data ->> 'admin' as admin
--        from auth.users where email in ('vous@exemple.com');            -- vos adresses de ADMIN_EMAILS
--      Chaque adresse doit avoir un compte que vous avez créé vous-même. Une adresse inconnue,
--      ou un compte que vous ne reconnaissez pas : retirez-la de ADMIN_EMAILS sur Vercel.
--   2. Donnez l'accès :            select public.set_admin('vous@exemple.com');
--   3. Pour retirer l'accès :      select public.set_admin('vous@exemple.com', false);
--   Puis rechargez /admin (pas besoin de se reconnecter).
-- =====================================================================

create or replace function public.set_admin(p_email text, p_admin boolean default true)
returns text
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_count integer;
begin
  update auth.users
  set raw_app_meta_data = case when p_admin
        then coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('admin', true)
        else coalesce(raw_app_meta_data, '{}'::jsonb) - 'admin' end
  where lower(email) = lower(trim(p_email));
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Aucun compte avec l''adresse « % ». Créez d''abord le compte (inscription normale), puis relancez.', p_email;
  end if;
  return format('%s : accès administrateur %s.', p_email, case when p_admin then 'activé' else 'retiré' end);
end;
$$;

-- Réservée au SQL Editor : ni les visiteurs ni les comptes connectés ne peuvent l'appeler
revoke all on function public.set_admin(text, boolean) from public, anon, authenticated;
