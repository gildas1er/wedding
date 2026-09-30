-- =====================================================================
-- MIGRATION 7 — Offre Premium (limite gratuite, paiements GeniusPay) et consentement CGU.
-- À lancer AVANT de déployer le code correspondant.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Formule du mariage
--    plan = 'free' | 'premium' ; premium_until = fin d'accès (NULL = sans limite de durée)
-- ---------------------------------------------------------------------
alter table public.marriages add column if not exists plan text not null default 'free';
alter table public.marriages add column if not exists premium_until timestamptz;
alter table public.marriages add column if not exists terms_accepted_at timestamptz;
alter table public.marriages add column if not exists terms_version text;
alter table public.marriages add column if not exists marketing_opt_in boolean not null default false;

do $$ begin
  alter table public.marriages add constraint marriages_plan_check check (plan in ('free', 'premium'));
exception when duplicate_object then null; end $$;

-- Premium actif ?
create or replace function public.marriage_is_premium(p_marriage_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.marriages
    where id = p_marriage_id and plan = 'premium' and (premium_until is null or premium_until > now())
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Seul le serveur (clé service) ou un administrateur peut changer la formule.
--    Un couple qui modifierait sa fiche depuis le navigateur ne peut pas s'offrir le Premium.
-- ---------------------------------------------------------------------
create or replace function public.protect_marriage_plan()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_privileged boolean := coalesce(auth.role(), '') = 'service_role' or current_user in ('postgres', 'supabase_admin');
begin
  if tg_op = 'INSERT' then
    if not v_privileged then
      new.plan := 'free';
      new.premium_until := null;
    end if;
  elsif not v_privileged and (new.plan is distinct from old.plan or new.premium_until is distinct from old.premium_until) then
    new.plan := old.plan;
    new.premium_until := old.premium_until;
  end if;
  return new;
end;
$$;

drop trigger if exists marriages_protect_plan on public.marriages;
create trigger marriages_protect_plan
  before insert or update on public.marriages
  for each row execute function public.protect_marriage_plan();

-- ---------------------------------------------------------------------
-- 3. Limite de la version gratuite : 30 fiches invités, appliquée par la base
--    (impossible à contourner depuis le navigateur, y compris par import CSV).
-- ---------------------------------------------------------------------
create or replace function public.enforce_free_guest_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_limit constant int := 30;
  v_count int;
begin
  if public.marriage_is_premium(new.marriage_id) then
    return new;
  end if;
  -- Verrou sur le mariage : deux ajouts simultanés ne peuvent pas dépasser la limite
  perform 1 from public.marriages where id = new.marriage_id for update;
  select count(*) into v_count from public.invite where marriage_id = new.marriage_id;
  if v_count >= v_limit then
    raise exception 'GUEST_LIMIT_REACHED'
      using errcode = 'P0001', detail = format('Limite gratuite de %s invités atteinte', v_limit), hint = 'premium';
  end if;
  return new;
end;
$$;

drop trigger if exists invite_free_limit on public.invite;
create trigger invite_free_limit
  before insert on public.invite
  for each row execute function public.enforce_free_guest_limit();

-- ---------------------------------------------------------------------
-- 4. Historique des paiements (écrit uniquement par le serveur)
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  marriage_id uuid not null references public.marriages (id) on delete cascade,
  provider text not null default 'geniuspay',
  reference text unique,
  amount integer not null,
  currency text not null default 'XOF',
  status text not null default 'pending',
  environment text,
  raw jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists payments_marriage_id_idx on public.payments (marriage_id, created_at desc);

alter table public.payments enable row level security;
drop policy if exists "Lecture de ses paiements" on public.payments;
create policy "Lecture de ses paiements" on public.payments
  for select to authenticated
  using (marriage_id in (select id from public.marriages where user_id = (select auth.uid())));
-- Aucune règle d'écriture : seules les routes serveur (clé service) enregistrent les paiements.

-- ---------------------------------------------------------------------
-- 5. Consentement à l'inscription (CGU, confidentialité, messages promotionnels)
--    Reprend la création automatique du mariage (migration 1) en y ajoutant le consentement.
-- ---------------------------------------------------------------------
create or replace function public.create_marriage_for_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_p1 text := coalesce(nullif(trim(v_meta->>'partner_name_1'), ''), nullif(trim(v_meta->>'full_name'), ''), 'Partenaire 1');
  v_p2 text := coalesce(nullif(trim(v_meta->>'partner_name_2'), ''), 'Partenaire 2');
  v_date date;
  v_terms_at timestamptz;
begin
  begin
    v_date := nullif(v_meta->>'wedding_date', '')::date;
  exception when others then
    v_date := null;
  end;
  begin
    v_terms_at := nullif(v_meta->>'terms_accepted_at', '')::timestamptz;
  exception when others then
    v_terms_at := null;
  end;

  if not exists (select 1 from public.marriages where user_id = new.id) then
    insert into public.marriages (user_id, partner_1_name, partner_2_name, wedding_date, location_city, couple_slug,
                                  terms_accepted_at, terms_version, marketing_opt_in)
    values (
      new.id, v_p1, v_p2,
      coalesce(v_date, (now() + interval '1 year')::date),
      'À définir',
      lower(regexp_replace(v_p1 || '-' || v_p2, '\s+', '-', 'g')) || '-' || floor(1000 + random() * 9000)::int,
      coalesce(v_terms_at, case when v_meta ? 'terms_version' then now() end),
      nullif(v_meta->>'terms_version', ''),
      coalesce(v_meta->>'marketing_opt_in', '') = 'true'
    );
  end if;
  return new;
exception when others then
  raise warning 'create_marriage_for_new_user: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.create_marriage_for_new_user() from public, anon, authenticated;
revoke all on function public.protect_marriage_plan() from public, anon, authenticated;
revoke all on function public.enforce_free_guest_limit() from public, anon, authenticated;
grant execute on function public.marriage_is_premium(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Activation manuelle (paiement reçu en espèces ou par virement), depuis le SQL Editor :
--   update public.marriages set plan = 'premium', premium_until = (wedding_date + interval '6 months')
--   where id = '<identifiant du mariage>';
-- ---------------------------------------------------------------------
