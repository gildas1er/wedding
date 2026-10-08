-- =====================================================================
-- MIGRATION 17 — Paliers selon le nombre d'invités (personnes : fiche + accompagnants).
--   Gratuit      : 30 personnes          (comptes créés AVANT cette migration : 30 fiches, comme avant)
--   Intime       : jusqu'à 100 personnes — 50 000 F
--   Famille      : jusqu'à 150 personnes — 75 000 F
--   Grande Fête  : jusqu'à 200 personnes — 100 000 F
--   Prestige     : jusqu'à 250 personnes — 125 000 F
--   Royal        : jusqu'à 300 personnes — 150 000 F
--   Sur mesure   : plus de 300, sur devis (limite fixée à l'activation)
-- Les couples déjà Premium gardent des invités illimités (palier « illimite »).
-- Aucune donnée existante n'est modifiée ni supprimée. À lancer après la migration 16.
-- =====================================================================

alter table public.marriages add column if not exists tier text;
alter table public.marriages add column if not exists guest_limit integer;           -- NULL = illimité
alter table public.marriages add column if not exists legacy_free_fiches boolean not null default false;

do $$ begin
  alter table public.marriages add constraint marriages_tier_check
    check (tier is null or tier in ('intime', 'famille', 'grande_fete', 'prestige', 'royal', 'sur_mesure', 'illimite'));
exception when duplicate_object then null; end $$;

-- 1. Comptes existants : rien ne change pour eux
--    • gratuits : la limite reste de 30 fiches (et non 30 personnes) ;
--    • Premium : invités illimités, au prix déjà payé.
update public.marriages set legacy_free_fiches = true where not legacy_free_fiches;
update public.marriages set tier = 'illimite', guest_limit = null where plan = 'premium' and tier is null;

-- 2. Limite applicable à un mariage : (limite, compte en personnes ?)
create or replace function public.marriage_guest_quota(p_marriage_id uuid)
returns table (guest_limit integer, by_persons boolean)
language sql stable security definer set search_path = public
as $$
  select
    case when m.plan = 'premium' and (m.premium_until is null or m.premium_until > now()) then m.guest_limit else 30 end,
    case when m.plan = 'premium' and (m.premium_until is null or m.premium_until > now()) then true else not m.legacy_free_fiches end
  from public.marriages m
  where m.id = p_marriage_id;
$$;
grant execute on function public.marriage_guest_quota(uuid) to authenticated;

-- 3. Contrôle à chaque ajout d'invité ou hausse du nombre d'accompagnants (remplace la limite de la migration 7)
create or replace function public.enforce_guest_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_limit integer;
  v_persons boolean;
  v_used integer;
  v_new integer := greatest(coalesce(new.guests_count, 1), 1);
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  select q.guest_limit, q.by_persons into v_limit, v_persons from public.marriage_guest_quota(new.marriage_id) q;
  if v_limit is null then
    return new; -- illimité
  end if;

  if tg_op = 'UPDATE' then
    -- Seule une hausse du nombre de personnes peut dépasser la limite (fiches : jamais en modification)
    if not v_persons or (new.marriage_id = old.marriage_id and v_new <= greatest(coalesce(old.guests_count, 1), 1)) then
      return new;
    end if;
  end if;

  -- Verrou sur le mariage : deux ajouts simultanés ne peuvent pas dépasser la limite
  perform 1 from public.marriages where id = new.marriage_id for update;

  if v_persons then
    select coalesce(sum(greatest(coalesce(guests_count, 1), 1)), 0) into v_used
    from public.invite
    where marriage_id = new.marriage_id and (tg_op = 'INSERT' or id <> new.id);
    if v_used + v_new > v_limit then
      raise exception 'GUEST_LIMIT_REACHED'
        using errcode = 'P0001', detail = format('Limite de %s invités atteinte (%s déjà prévus).', v_limit, v_used), hint = 'premium';
    end if;
  else
    select count(*) into v_used from public.invite where marriage_id = new.marriage_id;
    if v_used >= v_limit then
      raise exception 'GUEST_LIMIT_REACHED'
        using errcode = 'P0001', detail = format('Limite gratuite de %s fiches atteinte.', v_limit), hint = 'premium';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists invite_free_limit on public.invite;
drop trigger if exists invite_guest_limit on public.invite;
create trigger invite_guest_limit
  before insert or update of guests_count, marriage_id on public.invite
  for each row execute function public.enforce_guest_limit();

-- 4. La formule (palier, limite) reste réservée à l'administrateur (complète la migration 7)
--    CORRECTIF DE SÉCURITÉ : la version de la migration 7 testait current_user, qui vaut toujours « postgres »
--    dans une fonction security definer : un couple connecté pouvait donc changer sa formule lui-même.
--    On reconnaît désormais l'appelant à son rôle réel (anon / authenticated = jamais autorisé).
create or replace function public.protect_marriage_plan()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_privileged boolean := public.is_privileged_writer();
begin
  if tg_op = 'INSERT' then
    if not v_privileged then
      new.plan := 'free';
      new.premium_until := null;
      new.tier := null;
      new.guest_limit := null;
      new.legacy_free_fiches := false;
    end if;
  elsif not v_privileged then
    new.plan := old.plan;
    new.premium_until := old.premium_until;
    new.tier := old.tier;
    new.guest_limit := old.guest_limit;
    new.legacy_free_fiches := old.legacy_free_fiches;
  end if;
  return new;
end;
$$;

drop trigger if exists marriages_protect_plan on public.marriages;
create trigger marriages_protect_plan
  before insert or update on public.marriages
  for each row execute function public.protect_marriage_plan();

revoke all on function public.enforce_guest_limit() from public, anon, authenticated;
revoke all on function public.protect_marriage_plan() from public, anon, authenticated;

-- 5. Activation d'un palier après réception du paiement (SQL Editor uniquement) :
--      select public.activer_palier('1a2b3c4d', 'famille');
--      select public.activer_palier('1a2b3c4d', 'sur_mesure', 400);   -- plus de 300 invités : limite sur devis
--    Passer au palier supérieur : relancer la commande avec le nouveau palier (le couple paie la différence).
create or replace function public.activer_palier(p_reference text, p_palier text, p_limite integer default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_limit integer;
  v_matches integer;
  v_names text;
  v_until timestamptz;
begin
  v_limit := case p_palier
    when 'intime' then 100 when 'famille' then 150 when 'grande_fete' then 200
    when 'prestige' then 250 when 'royal' then 300 when 'sur_mesure' then p_limite
    when 'illimite' then null else -1 end;
  if v_limit = -1 then
    raise exception 'Palier inconnu « % ». Choisissez : intime, famille, grande_fete, prestige, royal, sur_mesure.', p_palier;
  end if;
  if p_palier = 'sur_mesure' and (p_limite is null or p_limite <= 300) then
    raise exception 'Pour le palier sur mesure, indiquez une limite de plus de 300 invités : activer_palier(''ref'', ''sur_mesure'', 400).';
  end if;

  select count(*) into v_matches from public.marriages where id::text like lower(trim(p_reference)) || '%';
  if v_matches <> 1 then
    raise exception 'Référence « % » : % mariage(s) trouvé(s). Vérifiez les 8 caractères affichés sur la page Premium du couple.', p_reference, v_matches;
  end if;

  update public.marriages
  set plan = 'premium',
      tier = p_palier,
      guest_limit = v_limit,
      premium_until = greatest(coalesce(wedding_date::date, current_date) + interval '1 month', now() + interval '1 month')
  where id::text like lower(trim(p_reference)) || '%'
  returning coalesce(partner_1_name, '') || ' & ' || coalesce(partner_2_name, ''), premium_until into v_names, v_until;

  return format('%s : palier %s (%s), accès jusqu''au %s.',
    v_names, p_palier, coalesce(v_limit::text || ' invités', 'invités illimités'), to_char(v_until, 'DD/MM/YYYY'));
end;
$$;

revoke all on function public.activer_palier(text, text, integer) from public, anon, authenticated;
