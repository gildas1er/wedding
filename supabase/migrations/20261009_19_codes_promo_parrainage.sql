-- =====================================================================
-- MIGRATION 19 — Codes promo et parrainage.
--   • Codes promo créés par l'administration (pourcentage ou montant, date limite, nombre d'utilisations,
--     partenaire et commission).
--   • Chaque couple reçoit un code de parrainage (ex. AWAYAO27). Un couple parrainé a une réduction
--     sur son premier palier ; son parrain reçoit une récompense quand il paie (versée à la main).
--   • Le couple saisit son code sur la page Premium ; la réduction est appliquée par l'administration
--     à l'activation du palier (paiement manuel).
-- Montants du parrainage : 5 000 F de réduction, 5 000 F de récompense (identiques à lib/promo.ts).
-- Ajout uniquement : aucune donnée existante n'est modifiée. À lancer après la migration 18.
-- =====================================================================

-- 1. Champs du mariage
alter table public.marriages add column if not exists referral_code text;               -- son code à partager
alter table public.marriages add column if not exists referred_by uuid;                 -- mariage du parrain
alter table public.marriages add column if not exists applied_code text;                -- code saisi (promo ou parrainage)
alter table public.marriages add column if not exists applied_code_at timestamptz;
alter table public.marriages add column if not exists applied_code_used_at timestamptz; -- réduction appliquée à un paiement
alter table public.marriages add column if not exists referral_reward_paid_at timestamptz; -- récompense versée au parrain

create unique index if not exists marriages_referral_code_key on public.marriages (referral_code) where referral_code is not null;
create index if not exists marriages_referred_by_idx on public.marriages (referred_by) where referred_by is not null;
create index if not exists marriages_applied_code_idx on public.marriages (applied_code) where applied_code is not null;

alter table public.payments add column if not exists promo_code text;

-- 2. Codes promo (lecture et écriture réservées au serveur)
create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{3,24}$'),
  label text,
  discount_type text not null check (discount_type in ('percent', 'amount')),
  discount_value integer not null check (discount_value > 0),
  valid_until timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  active boolean not null default true,
  partner_name text,
  partner_phone text,
  commission_xof integer not null default 0 check (commission_xof >= 0),
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;

-- 3. Code de parrainage lisible : 4 lettres de chaque prénom + 2 chiffres (AWAYAO27)
create or replace function public.make_referral_code(p1 text, p2 text)
returns text
language plpgsql volatile set search_path = public
as $$
declare
  clean text := upper(regexp_replace(translate(coalesce(left(p1, 12), '') || ' ' || coalesce(left(p2, 12), ''),
    'àâäáãåéèêëíìîïóòôöõúùûüçñÀÂÄÁÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇÑ', 'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN'), '[^A-Za-z ]', '', 'g'));
  base text;
  candidate text;
  i integer := 0;
begin
  base := left(split_part(clean, ' ', 1), 4) || left(split_part(clean, ' ', 2), 4);
  if length(base) < 3 then base := 'WEDDING'; end if;
  loop
    candidate := base || (case when i < 30 then floor(10 + random() * 90)::int else floor(100 + random() * 900)::int end)::text;
    exit when not exists (select 1 from public.marriages where referral_code = candidate)
      and not exists (select 1 from public.promo_codes where code = candidate);
    i := i + 1;
  end loop;
  return candidate;
end;
$$;

-- 4. Les champs du code ne changent que par le serveur ou par les fonctions ci-dessous
create or replace function public.protect_marriage_codes()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_allowed boolean := public.is_privileged_writer() or coalesce(current_setting('ws.codes', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if not v_allowed then
      new.referred_by := null; new.applied_code := null; new.applied_code_at := null;
      new.applied_code_used_at := null; new.referral_reward_paid_at := null; new.referral_code := null;
    end if;
    if new.referral_code is null then
      new.referral_code := public.make_referral_code(new.partner_1_name, new.partner_2_name);
    end if;
  elsif not v_allowed then
    new.referral_code := old.referral_code;
    new.referred_by := old.referred_by;
    new.applied_code := old.applied_code;
    new.applied_code_at := old.applied_code_at;
    new.applied_code_used_at := old.applied_code_used_at;
    new.referral_reward_paid_at := old.referral_reward_paid_at;
  end if;
  return new;
end;
$$;

drop trigger if exists marriages_protect_codes on public.marriages;
create trigger marriages_protect_codes
  before insert or update on public.marriages
  for each row execute function public.protect_marriage_codes();

-- Comptes existants : un code de parrainage pour chacun
update public.marriages set referral_code = public.make_referral_code(partner_1_name, partner_2_name) where referral_code is null;

-- 5. Saisie d'un code par le couple connecté (promo ou parrainage)
create or replace function public.apply_code(p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
  v_m public.marriages%rowtype;
  v_p public.promo_codes%rowtype;
  v_parrain public.marriages%rowtype;
  v_uses integer;
begin
  if v_code = '' then return jsonb_build_object('ok', false, 'message', 'Saisissez un code.'); end if;
  select * into v_m from public.marriages where user_id = auth.uid() order by created_at limit 1;
  if not found then return jsonb_build_object('ok', false, 'message', 'Connectez-vous pour utiliser un code.'); end if;
  if v_m.applied_code = v_code and v_m.applied_code_used_at is null then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  -- Un code ne sert qu'une fois par couple
  if (v_m.applied_code = v_code and v_m.applied_code_used_at is not null)
     or exists (select 1 from public.payments where marriage_id = v_m.id and promo_code = v_code) then
    return jsonb_build_object('ok', false, 'message', 'Vous avez déjà utilisé ce code.');
  end if;

  select * into v_p from public.promo_codes where code = v_code;
  if found then
    if not v_p.active or (v_p.valid_until is not null and v_p.valid_until < now()) then
      return jsonb_build_object('ok', false, 'message', 'Ce code n''est plus valable.');
    end if;
    if v_p.max_uses is not null then
      select count(*) into v_uses from public.marriages where applied_code = v_code and applied_code_used_at is not null;
      if v_uses >= v_p.max_uses then
        return jsonb_build_object('ok', false, 'message', 'Ce code a déjà été utilisé le nombre de fois prévu.');
      end if;
    end if;
    perform set_config('ws.codes', 'on', true);
    update public.marriages set applied_code = v_code, applied_code_at = now(), applied_code_used_at = null where id = v_m.id;
    return jsonb_build_object('ok', true);
  end if;

  select * into v_parrain from public.marriages where referral_code = v_code;
  if found then
    if v_parrain.id = v_m.id then
      return jsonb_build_object('ok', false, 'message', 'C''est votre propre code : partagez-le avec d''autres couples.');
    end if;
    if v_m.referred_by is not null and v_m.referred_by <> v_parrain.id then
      return jsonb_build_object('ok', false, 'message', 'Un autre couple vous a déjà parrainé.');
    end if;
    if v_m.tier is not null or exists (select 1 from public.payments where marriage_id = v_m.id and status = 'completed' and amount > 0) then
      return jsonb_build_object('ok', false, 'message', 'Le parrainage est réservé aux couples qui n''ont pas encore choisi de palier.');
    end if;
    perform set_config('ws.codes', 'on', true);
    update public.marriages set referred_by = v_parrain.id, applied_code = v_code, applied_code_at = now(), applied_code_used_at = null where id = v_m.id;
    return jsonb_build_object('ok', true);
  end if;

  return jsonb_build_object('ok', false, 'message', 'Code inconnu. Vérifiez l''orthographe.');
end;
$$;

-- Retirer le code saisi (tant qu'il n'a pas servi). Le parrain reste enregistré.
create or replace function public.remove_code()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('ws.codes', 'on', true);
  update public.marriages set applied_code = null, applied_code_at = null
  where user_id = auth.uid() and applied_code_used_at is null;
end;
$$;

-- 6. Code saisi et réduction, pour la page Premium du couple
create or replace function public.my_code()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_m public.marriages%rowtype;
  v_p public.promo_codes%rowtype;
  v_parrain text;
begin
  select * into v_m from public.marriages where user_id = auth.uid() order by created_at limit 1;
  if not found or v_m.applied_code is null then return null; end if;
  select * into v_p from public.promo_codes where code = v_m.applied_code;
  if found then
    return jsonb_build_object('code', v_m.applied_code, 'kind', 'promo', 'label', v_p.label,
      'discount_type', v_p.discount_type, 'discount_value', v_p.discount_value,
      'used', v_m.applied_code_used_at is not null,
      'valid', v_p.active and (v_p.valid_until is null or v_p.valid_until >= now()), 'valid_until', v_p.valid_until);
  end if;
  select coalesce(partner_1_name, '') || ' & ' || coalesce(partner_2_name, '') into v_parrain from public.marriages where id = v_m.referred_by;
  return jsonb_build_object('code', v_m.applied_code, 'kind', 'parrainage', 'label', 'Parrainé par ' || coalesce(v_parrain, 'un couple'),
    'discount_type', 'amount', 'discount_value', 5000,
    'used', v_m.applied_code_used_at is not null, 'valid', v_m.referred_by is not null);
end;
$$;

-- 7. Le parrainage du couple : son code et ses filleuls
create or replace function public.my_referrals()
returns jsonb
language sql stable security definer set search_path = public
as $$
  with me as (select id, referral_code from public.marriages where user_id = auth.uid() order by created_at limit 1),
  f as (select m.partner_1_name, m.tier, m.plan, m.referral_reward_paid_at, m.created_at from public.marriages m, me where m.referred_by = me.id)
  select jsonb_build_object(
    'code', (select referral_code from me),
    'signed_up', (select count(*) from f),
    'paid', (select count(*) from f where tier is not null and plan = 'premium'),
    'rewards_paid', (select count(*) from f where referral_reward_paid_at is not null),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('name', partner_1_name, 'paid', tier is not null and plan = 'premium') order by created_at desc) from f), '[]'::jsonb)
  );
$$;

-- 8. Page d'inscription : qui invite ? (prénoms du couple parrain seulement)
create or replace function public.referral_inviter(p_code text)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(partner_1_name, '') || ' & ' || coalesce(partner_2_name, '')
  from public.marriages where referral_code = upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
$$;

-- 9. Inscription : le code de parrainage du lien est enregistré avec le nouveau mariage
create or replace function public.create_marriage_for_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_p1 text := coalesce(nullif(trim(v_meta->>'partner_name_1'), ''), nullif(trim(v_meta->>'full_name'), ''), 'Partenaire 1');
  v_p2 text := coalesce(nullif(trim(v_meta->>'partner_name_2'), ''), 'Partenaire 2');
  v_ref text := upper(regexp_replace(coalesce(v_meta->>'referral_code', ''), '\s+', '', 'g'));
  v_parrain uuid;
  v_date date;
begin
  begin
    v_date := nullif(v_meta->>'wedding_date', '')::date;
  exception when others then
    v_date := null;
  end;
  if v_ref <> '' then
    select id into v_parrain from public.marriages where referral_code = v_ref;
  end if;

  if not exists (select 1 from public.marriages where user_id = new.id) then
    perform set_config('ws.codes', 'on', true);
    insert into public.marriages (user_id, partner_1_name, partner_2_name, wedding_date, location_city, couple_slug, referred_by, applied_code, applied_code_at)
    values (
      new.id, v_p1, v_p2,
      coalesce(v_date, (now() + interval '1 year')::date),
      'À définir',
      lower(regexp_replace(v_p1 || '-' || v_p2, '\s+', '-', 'g')) || '-' || floor(1000 + random() * 9000)::int,
      v_parrain,
      case when v_parrain is not null then v_ref end,
      case when v_parrain is not null then now() end
    );
    perform set_config('ws.codes', '', true);
  end if;
  return new;
exception when others then
  raise warning 'create_marriage_for_new_user: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.create_marriage_for_new_user() from public, anon, authenticated;
revoke all on function public.protect_marriage_codes() from public, anon, authenticated;
revoke all on function public.make_referral_code(text, text) from public, anon, authenticated;
revoke all on function public.apply_code(text) from public, anon;
revoke all on function public.remove_code() from public, anon;
revoke all on function public.my_code() from public, anon;
revoke all on function public.my_referrals() from public, anon;
grant execute on function public.apply_code(text) to authenticated;
grant execute on function public.remove_code() to authenticated;
grant execute on function public.my_code() to authenticated;
grant execute on function public.my_referrals() to authenticated;
grant execute on function public.referral_inviter(text) to anon, authenticated;
