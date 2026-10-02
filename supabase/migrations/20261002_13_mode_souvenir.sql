-- =====================================================================
-- MIGRATION 13 — Mode souvenir après le mariage.
--   • Jusqu'à 1 mois après le mariage : espace complet (le Premium s'arrête aussi à J+1 mois).
--   • Ensuite : mode souvenir, l'espace est en lecture seule (consultation et téléchargement).
--   • 12 mois après le mariage : suppression automatique (tâche planifiée /api/cron/purge).
--   • Prolongation payante : kept_until (écrit uniquement par l'administrateur).
-- À lancer après la migration 12.
-- =====================================================================

-- 1. Fin de la prolongation éventuelle (NULL = pas de prolongation)
alter table public.marriages add column if not exists kept_until timestamptz;

-- 2. Phase de l'espace : 'active' ou 'souvenir'
create or replace function public.marriage_space_phase(p_marriage_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when m.wedding_date is null then 'active'
    when now() < greatest((m.wedding_date::date + interval '1 month')::timestamptz, coalesce(m.kept_until, '-infinity'::timestamptz)) then 'active'
    else 'souvenir'
  end
  from public.marriages m
  where m.id = p_marriage_id;
$$;
grant execute on function public.marriage_space_phase(uuid) to anon, authenticated;

-- Écriture « privilégiée » : clé service, éditeur SQL, tâches planifiées (pas les invités ni les mariés)
create or replace function public.is_privileged_writer()
returns boolean
language sql stable
as $$
  select coalesce(auth.role(), '') not in ('anon', 'authenticated');
$$;

-- 3. En mode souvenir, plus aucune modification des données du mariage (ni par les mariés, ni par les invités)
create or replace function public.enforce_space_active()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_marriage uuid := case when tg_op = 'DELETE' then old.marriage_id else new.marriage_id end;
begin
  if public.is_privileged_writer() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if public.marriage_space_phase(v_marriage) = 'souvenir' then
    raise exception 'SPACE_ARCHIVED'
      using errcode = 'P0001', detail = 'Votre espace est en mode souvenir : il est consultable mais ne peut plus être modifié.', hint = 'souvenir';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['invite', 'tables', 'budget_items', 'planning_events', 'tasks', 'guestbook'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_space_active', t);
      execute format('create trigger %I before insert or update or delete on public.%I for each row execute function public.enforce_space_active()', t || '_space_active', t);
    end if;
  end loop;
end $$;

-- 4. Fiche du mariage : lecture seule en mode souvenir, date figée une fois le mariage passé,
--    prolongation réservée à l'administrateur
create or replace function public.guard_marriage_lifecycle()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  new.kept_until := old.kept_until;
  if public.marriage_space_phase(old.id) = 'souvenir' then
    raise exception 'SPACE_ARCHIVED'
      using errcode = 'P0001', detail = 'Votre espace est en mode souvenir : il est consultable mais ne peut plus être modifié.', hint = 'souvenir';
  end if;
  if old.wedding_date is not null and old.wedding_date::date < current_date
     and new.wedding_date is distinct from old.wedding_date then
    raise exception 'WEDDING_DATE_LOCKED'
      using errcode = 'P0001', detail = 'La date d''un mariage passé ne peut plus être modifiée.', hint = 'souvenir';
  end if;
  return new;
end;
$$;

drop trigger if exists marriages_lifecycle_guard on public.marriages;
create trigger marriages_lifecycle_guard
  before update on public.marriages
  for each row execute function public.guard_marriage_lifecycle();

revoke all on function public.enforce_space_active() from public, anon, authenticated;
revoke all on function public.guard_marriage_lifecycle() from public, anon, authenticated;

-- 5. La page RSVP connaît la phase de l'espace (réponses closes en mode souvenir)
create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date, public.marriage_space_phase(id) as space_phase,
               primary_color, accent_color, invitation_template, invitation_text, bg_image_url, bg_image_position, music_url,
               show_dot, show_civil, show_religious, show_reception, practical_info,
               dot_date, dot_hour, dot_location, dot_maps_url,
               mairie_date, mairie_hour, mairie_location, mairie_maps_url,
               religious_date, religious_hour, religious_location, religious_maps_url,
               reception_date, reception_hour, reception_location, reception_maps_url
        from public.marriages
        where id = p_marriage_id
      ) m
    ),
    'guest', (
      select to_jsonb(g) from (
        select id, name, status, guests_count, notes,
               attending_dot, attending_civil, attending_church, attending_reception
        from public.invite
        where id = p_guest_id and marriage_id = p_marriage_id
      ) g
    )
  );
$$;

-- ---------------------------------------------------------------------
-- Prolonger un espace de 6 mois (après réception du paiement), depuis le SQL Editor :
--   update public.marriages
--   set kept_until = greatest(now(), wedding_date::date + interval '1 month', coalesce(kept_until, now())) + interval '6 months'
--   where id::text like '<référence>%';
-- ---------------------------------------------------------------------
