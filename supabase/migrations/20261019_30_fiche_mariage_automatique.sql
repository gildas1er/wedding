-- =====================================================================
-- MIGRATION 30 — Fiche mariage créée automatiquement, dans tous les cas.
-- Constat (19 octobre 2026) : en production, le déclencheur qui crée la fiche mariage à chaque nouveau
-- compte (migration 1) était absent. Les comptes créés avec la confirmation des e-mails ou avec Google
-- restaient sans fiche (tableau de bord vide) et l'administrateur devait la créer à la main.
-- 1. Une seule fonction de création (prénoms, date, consentement, parrainage), utilisée partout.
-- 2. Le déclencheur à l'inscription est remis en place.
-- 3. Filet de sécurité : ensure_my_marriage(), appelée par l'espace des mariés quand un couple
--    connecté n'a pas de fiche ; elle la crée aussitôt (uniquement pour lui, une seule fois,
--    jamais pour un compte administrateur).
-- 4. Rattrapage : une fiche pour chaque compte existant qui n'en a pas (sauf les administrateurs).
-- Rétablit aussi l'enregistrement du consentement (oublié par la migration 19).
-- À lancer après la migration 19. Relançable.
-- =====================================================================

-- 1. Création de la fiche d'un compte (rien si elle existe déjà) ; renvoie l'identifiant du mariage
create or replace function public.create_marriage_for_user(p_user uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_meta jsonb;
  v_p1 text; v_p2 text; v_date date; v_terms_at timestamptz;
  v_ref text; v_parrain uuid; v_id uuid;
begin
  -- Deux appels en même temps pour le même compte : un seul crée la fiche
  perform pg_advisory_xact_lock(hashtext('marriage:' || p_user::text));
  select id into v_id from public.marriages where user_id = p_user order by created_at limit 1;
  if v_id is not null then return v_id; end if;

  select coalesce(raw_user_meta_data, '{}'::jsonb) into v_meta from auth.users where id = p_user;
  if not found then return null; end if;

  v_p1 := coalesce(nullif(trim(v_meta->>'partner_name_1'), ''), nullif(trim(v_meta->>'full_name'), ''), 'Partenaire 1');
  v_p2 := coalesce(nullif(trim(v_meta->>'partner_name_2'), ''), 'Partenaire 2');
  begin v_date := nullif(v_meta->>'wedding_date', '')::date; exception when others then v_date := null; end;
  begin v_terms_at := nullif(v_meta->>'terms_accepted_at', '')::timestamptz; exception when others then v_terms_at := null; end;
  v_ref := upper(regexp_replace(coalesce(v_meta->>'referral_code', ''), '\s+', '', 'g'));
  if v_ref <> '' then
    select id into v_parrain from public.marriages where referral_code = v_ref;
  end if;

  perform set_config('ws.codes', 'on', true);
  insert into public.marriages (user_id, partner_1_name, partner_2_name, wedding_date, location_city, couple_slug,
                                terms_accepted_at, terms_version, marketing_opt_in,
                                referred_by, applied_code, applied_code_at)
  values (
    p_user, v_p1, v_p2,
    coalesce(v_date, (now() + interval '1 year')::date),
    'À définir',
    lower(regexp_replace(v_p1 || '-' || v_p2, '\s+', '-', 'g')) || '-' || floor(1000 + random() * 9000)::int,
    coalesce(v_terms_at, case when v_meta ? 'terms_version' then now() end),
    nullif(v_meta->>'terms_version', ''),
    coalesce(v_meta->>'marketing_opt_in', '') = 'true',
    v_parrain,
    case when v_parrain is not null then v_ref end,
    case when v_parrain is not null then now() end
  )
  returning id into v_id;
  perform set_config('ws.codes', '', true);
  return v_id;
end;
$$;
revoke all on function public.create_marriage_for_user(uuid) from public, anon, authenticated;

-- 2. À l'inscription (e-mail, Google, ajout à la main dans Supabase). Ne bloque jamais l'inscription :
--    en cas d'erreur, le filet de sécurité (3) crée la fiche à la première ouverture de l'espace.
create or replace function public.create_marriage_for_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.create_marriage_for_user(new.id);
  return new;
exception when others then
  raise warning 'create_marriage_for_new_user: %', sqlerrm;
  return new;
end;
$$;
revoke all on function public.create_marriage_for_new_user() from public, anon, authenticated;

do $$
begin
  drop trigger if exists on_auth_user_created_marriage on auth.users;
  create trigger on_auth_user_created_marriage
    after insert on auth.users
    for each row execute function public.create_marriage_for_new_user();
  raise notice 'Création automatique de la fiche à l''inscription : en place.';
exception when insufficient_privilege then
  raise notice 'À FAIRE À LA MAIN — impossible de créer le déclencheur sur auth.users depuis ici. Envoyez-moi ce message. Le filet de sécurité (ensure_my_marriage) fonctionne quand même.';
end $$;

-- 3. Filet de sécurité : le couple connecté reçoit sa fiche s'il n'en a pas.
--    Jamais pour un compte administrateur (il n'a pas de mariage, même s'il ouvre l'espace des mariés).
create or replace function public.ensure_my_marriage()
returns setof public.marriages
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if exists (select 1 from auth.users u where u.id = v_uid and coalesce((u.raw_app_meta_data ->> 'admin')::boolean, false)) then
    return;
  end if;
  perform public.create_marriage_for_user(v_uid);
  return query select * from public.marriages where user_id = v_uid order by created_at limit 1;
end;
$$;
revoke all on function public.ensure_my_marriage() from public, anon;
grant execute on function public.ensure_my_marriage() to authenticated;

-- 4. Rattrapage des comptes existants sans fiche (les comptes administrateurs n'en ont pas besoin)
do $$
declare r record; n integer := 0;
begin
  for r in
    select u.id, u.email from auth.users u
    where not exists (select 1 from public.marriages m where m.user_id = u.id)
      and coalesce((u.raw_app_meta_data ->> 'admin')::boolean, false) = false
  loop
    begin
      perform public.create_marriage_for_user(r.id);
      n := n + 1;
      raise notice 'Fiche créée pour %', r.email;
    exception when others then
      raise notice 'Fiche NON créée pour % : %', r.email, sqlerrm;
    end;
  end loop;
  raise notice 'Rattrapage : % fiche(s) créée(s).', n;
end $$;
