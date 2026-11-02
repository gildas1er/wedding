-- =====================================================================
-- MIGRATION 32 — Billet d'entrée des invités et contrôle à l'entrée.
--   Réservé aux formules payantes (marriage_is_premium).
--   - Chaque fiche invité confirmée reçoit un code de billet (8 caractères),
--     imprimé sur le billet et dans son QR code. Un billet par fiche :
--     le nombre de personnes est celui fixé par les mariés.
--   - L'équipe d'accueil ouvre /accueil avec la clé secrète du mariage
--     (lien donné par les mariés, qu'ils peuvent renouveler) ; un scan
--     marque la fiche « arrivée », un second scan est signalé.
--   Aucune donnée existante n'est modifiée. À lancer après la 31.
-- =====================================================================

-- 1. Colonnes
alter table public.invite
  add column if not exists ticket_code text,
  add column if not exists checked_in_at timestamptz;

create unique index if not exists invite_ticket_code_key on public.invite (ticket_code);

alter table public.marriages
  add column if not exists checkin_key text;

-- 2. Code lisible : sans 0/O, 1/I/L pour éviter les erreurs de saisie à l'entrée
create or replace function public.new_ticket_code()
returns text
language plpgsql volatile set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      into v_code from generate_series(1, 8);
    exit when not exists (select 1 from public.invite where ticket_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Code du billet d'une fiche, créé à la première demande
create or replace function public.ensure_ticket_code(p_guest_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
begin
  select ticket_code into v_code from public.invite where id = p_guest_id;
  if v_code is null then
    v_code := public.new_ticket_code();
    update public.invite set ticket_code = v_code where id = p_guest_id and ticket_code is null
    returning ticket_code into v_code;
    if v_code is null then
      select ticket_code into v_code from public.invite where id = p_guest_id;
    end if;
  end if;
  return v_code;
end;
$$;

-- Saisie à l'entrée : majuscules, sans espaces ni tirets
create or replace function public.normalize_ticket_code(p_code text)
returns text
language sql immutable
as $$
  select nullif(left(regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'), 8), '');
$$;

-- 3. Billet de l'invité (page RSVP, après « Je serai là »).
--    L'identifiant de la fiche (clé du lien personnel) sert de preuve, comme pour submit_rsvp.
create or replace function public.get_guest_ticket(p_marriage_id uuid, p_guest_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_guest public.invite%rowtype;
  v_table text;
begin
  if not public.marriage_is_premium(p_marriage_id) or public.marriage_space_phase(p_marriage_id) = 'souvenir' then
    return null;
  end if;
  select * into v_guest from public.invite where id = p_guest_id and marriage_id = p_marriage_id;
  if not found or v_guest.status is distinct from 'confirmé' then
    return null;
  end if;
  select name into v_table from public.tables where id = v_guest.table_id;
  return jsonb_build_object(
    'code', public.ensure_ticket_code(v_guest.id),
    'name', v_guest.name,
    'guests_count', greatest(1, coalesce(v_guest.guests_count, 1)),
    'table_name', v_table,
    'attending_dot', coalesce(v_guest.attending_dot, false),
    'attending_civil', coalesce(v_guest.attending_civil, false),
    'attending_church', coalesce(v_guest.attending_church, false),
    'attending_reception', coalesce(v_guest.attending_reception, false)
  );
end;
$$;

-- 4. Clé de l'équipe d'accueil (mariés connectés)
create or replace function public.my_checkin_key(p_reset boolean default false)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_key text;
begin
  select id, checkin_key into v_id, v_key
  from public.marriages where user_id = auth.uid()
  order by created_at asc limit 1;
  if v_id is null then
    raise exception 'Mariage introuvable' using errcode = 'P0002';
  end if;
  if not public.marriage_is_premium(v_id) then
    raise exception 'PREMIUM_REQUIRED' using errcode = 'P0001', hint = 'premium';
  end if;
  if v_key is null or p_reset then
    v_key := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.marriages set checkin_key = v_key where id = v_id;
  end if;
  return v_key;
end;
$$;

-- Clé valable : bon mariage, formule payante. Les refus sont comptés par IP (fonctions de la migration 23).
create or replace function public.checkin_allowed(p_marriage_id uuid, p_key text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_rate_key text := 'checkin:' || public.request_ip();
begin
  if public.rate_count(v_rate_key, interval '10 minutes') >= 20 then
    raise exception 'TOO_MANY_ATTEMPTS' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  if p_key is null or length(p_key) < 32 or not exists (
    select 1 from public.marriages where id = p_marriage_id and checkin_key = p_key
  ) or not public.marriage_is_premium(p_marriage_id) then
    perform public.rate_hit(v_rate_key);
    return false;
  end if;
  return true;
end;
$$;

-- Chiffres de l'entrée : personnes arrivées / personnes attendues (fiches confirmées)
create or replace function public.checkin_stats(p_marriage_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'arrived', coalesce(sum(greatest(1, coalesce(guests_count, 1))) filter (where checked_in_at is not null), 0),
    'expected', coalesce(sum(greatest(1, coalesce(guests_count, 1))) filter (where status = 'confirmé'), 0)
  )
  from public.invite where marriage_id = p_marriage_id;
$$;

-- 5. Scan d'un billet à l'entrée.
--    result : 'ok' (entrée enregistrée), 'already' (déjà entré), 'not_confirmed', 'unknown', 'denied'.
--    p_undo : annule une entrée enregistrée par erreur.
create or replace function public.checkin_ticket(p_marriage_id uuid, p_key text, p_code text, p_undo boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := public.normalize_ticket_code(p_code);
  v_guest public.invite%rowtype;
  v_table text;
  v_result text;
  v_rate_key text := 'checkin:' || public.request_ip();
begin
  if not public.checkin_allowed(p_marriage_id, p_key) then
    return jsonb_build_object('result', 'denied');
  end if;

  select * into v_guest from public.invite where marriage_id = p_marriage_id and ticket_code = v_code;
  if not found then
    perform public.rate_hit(v_rate_key);
    return jsonb_build_object('result', 'unknown', 'stats', public.checkin_stats(p_marriage_id));
  end if;

  if p_undo then
    update public.invite set checked_in_at = null where id = v_guest.id;
    v_guest.checked_in_at := null;
    v_result := 'undone';
  elsif v_guest.checked_in_at is not null then
    v_result := 'already';
  elsif v_guest.status is distinct from 'confirmé' then
    v_result := 'not_confirmed';
  else
    update public.invite set checked_in_at = now() where id = v_guest.id
    returning checked_in_at into v_guest.checked_in_at;
    v_result := 'ok';
  end if;

  select name into v_table from public.tables where id = v_guest.table_id;
  return jsonb_build_object(
    'result', v_result,
    'code', v_guest.ticket_code,
    'name', v_guest.name,
    'guests_count', greatest(1, coalesce(v_guest.guests_count, 1)),
    'table_name', v_table,
    'status', v_guest.status,
    'checked_in_at', v_guest.checked_in_at,
    'stats', public.checkin_stats(p_marriage_id)
  );
end;
$$;

-- Entrée « forcée » d'un invité non confirmé, décidée par l'équipe d'accueil
create or replace function public.checkin_force(p_marriage_id uuid, p_key text, p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.checkin_allowed(p_marriage_id, p_key) then
    return jsonb_build_object('result', 'denied');
  end if;
  update public.invite set checked_in_at = coalesce(checked_in_at, now())
  where marriage_id = p_marriage_id and ticket_code = public.normalize_ticket_code(p_code);
  return public.checkin_ticket(p_marriage_id, p_key, p_code);
end;
$$;

-- 6. Recherche par nom à l'entrée (invité sans billet, téléphone éteint…)
create or replace function public.checkin_search(p_marriage_id uuid, p_key text, p_query text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
begin
  if not public.checkin_allowed(p_marriage_id, p_key) then
    return jsonb_build_object('result', 'denied');
  end if;
  if char_length(v_query) < 2 then
    return jsonb_build_object('result', 'ok', 'guests', '[]'::jsonb);
  end if;
  return jsonb_build_object('result', 'ok', 'guests', coalesce((
    select jsonb_agg(g order by g.name)
    from (
      select public.ensure_ticket_code(i.id) as code, i.name,
             greatest(1, coalesce(i.guests_count, 1)) as guests_count,
             t.name as table_name, i.status, i.checked_in_at
      from public.invite i
      left join public.tables t on t.id = i.table_id
      where i.marriage_id = p_marriage_id
        and i.name ilike '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      order by i.name
      limit 8
    ) g
  ), '[]'::jsonb));
end;
$$;

-- Ouverture de la page d'accueil : vérifie la clé, donne les prénoms et les chiffres
create or replace function public.checkin_open(p_marriage_id uuid, p_key text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.checkin_allowed(p_marriage_id, p_key) then
    return jsonb_build_object('result', 'denied');
  end if;
  return (
    select jsonb_build_object(
      'result', 'ok',
      'couple', concat_ws(' & ', nullif(partner_1_name, ''), nullif(partner_2_name, '')),
      'stats', public.checkin_stats(p_marriage_id)
    )
    from public.marriages where id = p_marriage_id
  );
end;
$$;

-- 7. Droits
revoke all on function public.new_ticket_code() from public, anon, authenticated;
revoke all on function public.ensure_ticket_code(uuid) from public, anon, authenticated;
revoke all on function public.checkin_allowed(uuid, text) from public, anon, authenticated;
revoke all on function public.checkin_stats(uuid) from public, anon, authenticated;
revoke all on function public.my_checkin_key(boolean) from public, anon;
grant execute on function public.normalize_ticket_code(text) to anon, authenticated;
grant execute on function public.get_guest_ticket(uuid, uuid) to anon, authenticated;
grant execute on function public.my_checkin_key(boolean) to authenticated;
grant execute on function public.checkin_open(uuid, text) to anon, authenticated;
grant execute on function public.checkin_ticket(uuid, text, text, boolean) to anon, authenticated;
grant execute on function public.checkin_force(uuid, text, text) to anon, authenticated;
grant execute on function public.checkin_search(uuid, text, text) to anon, authenticated;
