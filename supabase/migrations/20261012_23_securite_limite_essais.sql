-- =====================================================================
-- MIGRATION 23 — Sécurité : limite d'essais (audit de sécurité du 12 octobre 2026, constat 8).
--   • Codes promo : 10 codes refusés par compte et par heure, puis « Trop d'essais ».
--   • « Trouver ma table » : 60 recherches par adresse IP et par mariage toutes les 10 minutes,
--     et 1 000 par mariage toutes les 10 minutes (toutes adresses confondues, pour l'entrée de la salle).
--   Un invité ou un couple normal ne voit jamais la limite : seuls les programmes automatiques sont freinés.
-- Les essais sont notés dans une petite table, effacée automatiquement au bout d'une journée.
-- À lancer APRÈS la migration 20 (Trouver ma table) et la 19 (codes promo). Relançable.
-- =====================================================================

-- 1. Trace des essais (aucune règle d'accès : seules les fonctions ci-dessous y écrivent)
create table if not exists public.rate_limit_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_limit_hits_key_at_idx on public.rate_limit_hits (key, at);
alter table public.rate_limit_hits enable row level security;

-- Adresse IP de l'appelant (transmise par Supabase) ; « inconnue » si absente
create or replace function public.request_ip()
returns text
language sql stable set search_path = public
as $$
  select coalesce(
    nullif(h ->> 'cf-connecting-ip', ''),
    nullif(h ->> 'x-real-ip', ''),
    nullif(trim(split_part(h ->> 'x-forwarded-for', ',', 1)), ''),
    'inconnue')
  from (select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json as h) x;
$$;

-- Nombre d'essais d'une clé dans la fenêtre (et nettoyage des vieilles traces)
create or replace function public.rate_count(p_key text, p_window interval)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v integer;
begin
  if random() < 0.02 then
    delete from public.rate_limit_hits where at < now() - interval '1 day';
  end if;
  select count(*) into v from public.rate_limit_hits where key = p_key and at > now() - p_window;
  return v;
end;
$$;

create or replace function public.rate_hit(p_key text)
returns void
language sql security definer set search_path = public
as $$
  insert into public.rate_limit_hits (key) values (p_key);
$$;

revoke all on table public.rate_limit_hits from public, anon, authenticated;
revoke all on function public.request_ip() from public, anon, authenticated;
revoke all on function public.rate_count(text, interval) from public, anon, authenticated;
revoke all on function public.rate_hit(text) from public, anon, authenticated;

-- 2. « Trouver ma table » avec limite (même résultat qu'en migration 20 : jamais l'identifiant des invités)
drop function if exists public.find_guest_table(uuid, text);
create function public.find_guest_table(p_marriage_id uuid, p_query text)
returns table (name text, guests_count int, table_name text)
language plpgsql security definer set search_path = public
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_ip_key text := 'table:' || p_marriage_id::text || ':' || public.request_ip();
  v_all_key text := 'table:' || p_marriage_id::text;
begin
  if char_length(v_query) < 3 then
    return;
  end if;
  if public.rate_count(v_ip_key, interval '10 minutes') >= 60
     or public.rate_count(v_all_key, interval '10 minutes') >= 1000 then
    raise exception 'TOO_MANY_REQUESTS' using errcode = 'P0001', detail = 'Trop de recherches : réessayez dans quelques minutes.';
  end if;
  perform public.rate_hit(v_ip_key);
  perform public.rate_hit(v_all_key);
  return query
    select i.name, coalesce(i.guests_count, 1), t.name
    from public.invite i
    left join public.tables t on t.id = i.table_id
    where i.marriage_id = p_marriage_id
      and i.name ilike '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    order by i.name
    limit 5;
end;
$$;
revoke all on function public.find_guest_table(uuid, text) from public;
grant execute on function public.find_guest_table(uuid, text) to anon, authenticated;

-- 3. Codes promo : même logique qu'en migration 19, avec 10 codes refusés au plus par compte et par heure
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
  v_key text;
  v_msg text;
begin
  if v_code = '' then return jsonb_build_object('ok', false, 'message', 'Saisissez un code.'); end if;
  select * into v_m from public.marriages where user_id = auth.uid() order by created_at limit 1;
  if not found then return jsonb_build_object('ok', false, 'message', 'Connectez-vous pour utiliser un code.'); end if;

  v_key := 'code:' || auth.uid()::text;
  if public.rate_count(v_key, interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'message', 'Trop d''essais. Réessayez dans une heure, ou contactez-nous.');
  end if;

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

  -- Code inconnu : seul cas compté (c'est celui des essais au hasard)
  perform public.rate_hit(v_key);
  v_msg := 'Code inconnu. Vérifiez l''orthographe.';
  return jsonb_build_object('ok', false, 'message', v_msg);
end;
$$;
revoke all on function public.apply_code(text) from public, anon;
grant execute on function public.apply_code(text) to authenticated;
