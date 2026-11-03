-- =====================================================================
-- MIGRATION 33 — Moment où le billet d'entrée est disponible, et envoi des billets.
--   - Choix du couple dans le Studio (marriages.ticket_release) :
--       'confirmation' : billet dès que l'invité confirme (par défaut, et pour
--                        tous les couples existants) ;
--       'veille'       : billet à partir de la veille de la PREMIÈRE cérémonie
--                        à laquelle l'invité a dit venir (la dot peut avoir lieu
--                        plusieurs jours avant), à minuit, heure d'Abidjan (UTC).
--   - invite.ticket_sent_at : date du message WhatsApp « Votre billet est prêt »
--     envoyé par le couple (page Accueil des invités).
--   Remplace get_guest_ticket (migration 32). À lancer après la 32.
-- =====================================================================

alter table public.marriages
  add column if not exists ticket_release text not null default 'confirmation';

do $$ begin
  alter table public.marriages add constraint marriages_ticket_release_check check (ticket_release in ('confirmation', 'veille'));
exception when duplicate_object then null; end $$;

alter table public.invite
  add column if not exists ticket_sent_at timestamptz;

-- Date « AAAA-MM-JJ » au début d'un texte (les anciennes saisies en texte libre sont ignorées)
create or replace function public.iso_date_or_null(p text)
returns date
language plpgsql immutable
as $$
begin
  if p ~ '^\d{4}-\d{2}-\d{2}' then
    return left(p, 10)::date;
  end if;
  return null;
exception when others then
  return null;
end;
$$;

-- Jour où le billet devient disponible (null : tout de suite)
create or replace function public.ticket_available_from(p_marriage_id uuid, p_guest_id uuid)
returns date
language sql stable security definer set search_path = public
as $$
  select case when m.ticket_release = 'veille' then
    coalesce(
      least(
        case when coalesce(m.show_dot, false) and coalesce(i.attending_dot, true) then public.iso_date_or_null(m.dot_date::text) end,
        case when coalesce(m.show_civil, true) and coalesce(i.attending_civil, true) then public.iso_date_or_null(m.mairie_date::text) end,
        case when coalesce(m.show_religious, m.religious_date is not null or m.religious_hour is not null) and coalesce(i.attending_church, true)
             then public.iso_date_or_null(m.religious_date::text) end,
        case when coalesce(m.show_reception, true) and coalesce(i.attending_reception, true) then public.iso_date_or_null(m.reception_date::text) end
      ),
      public.iso_date_or_null(m.wedding_date::text)
    ) - 1
  end
  from public.marriages m
  join public.invite i on i.marriage_id = m.id and i.id = p_guest_id
  where m.id = p_marriage_id;
$$;

-- Billet de l'invité : comme en migration 32, avec la date de disponibilité.
-- Avant cette date, seul « available_from » est renvoyé (pas de code, donc pas de QR code à partager).
create or replace function public.get_guest_ticket(p_marriage_id uuid, p_guest_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_guest public.invite%rowtype;
  v_table text;
  v_from date;
begin
  if not public.marriage_is_premium(p_marriage_id) or public.marriage_space_phase(p_marriage_id) = 'souvenir' then
    return null;
  end if;
  select * into v_guest from public.invite where id = p_guest_id and marriage_id = p_marriage_id;
  if not found or v_guest.status is distinct from 'confirmé' then
    return null;
  end if;
  v_from := public.ticket_available_from(p_marriage_id, p_guest_id);
  if v_from is not null and (now() at time zone 'Africa/Abidjan')::date < v_from then
    return jsonb_build_object('available_from', v_from);
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

revoke all on function public.ticket_available_from(uuid, uuid) from public, anon, authenticated;
grant execute on function public.iso_date_or_null(text) to anon, authenticated;
grant execute on function public.get_guest_ticket(uuid, uuid) to anon, authenticated;
