-- =====================================================================
-- MIGRATION 12 — Cérémonie de la dot (mariage coutumier), avant la cérémonie civile.
-- Sans risque (ajout uniquement). À lancer après la migration 11.
-- =====================================================================

-- 1. La cérémonie dans le programme de l'invitation (masquée par défaut)
alter table public.marriages add column if not exists show_dot boolean not null default false;
alter table public.marriages add column if not exists dot_date date;
alter table public.marriages add column if not exists dot_hour text;
alter table public.marriages add column if not exists dot_location text;
alter table public.marriages add column if not exists dot_maps_url text;

-- 2. Présence des invités à la dot
alter table public.invite add column if not exists attending_dot boolean default true;

-- 3. La page RSVP a besoin de la dot (reprend les colonnes des migrations précédentes)
create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date,
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

-- 4. Réponse de l'invité : ajoute la présence à la dot (facultative, oui par défaut)
drop function if exists public.submit_rsvp(uuid, uuid, text, text, boolean, boolean, boolean);
create or replace function public.submit_rsvp(
  p_marriage_id uuid,
  p_guest_id uuid,
  p_status text,
  p_notes text default null,
  p_attending_civil boolean default true,
  p_attending_church boolean default true,
  p_attending_reception boolean default true,
  p_attending_dot boolean default true
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_declined boolean := p_status = 'décliné';
begin
  if p_status is null or p_status not in ('confirmé', 'décliné') then
    raise exception 'Statut invalide' using errcode = '22023';
  end if;

  update public.invite set
    status              = p_status,
    -- l'invité ne peut pas augmenter son nombre d'accompagnants lui-même
    guests_count        = case when v_declined then 1 else guests_count end,
    notes               = nullif(left(trim(coalesce(p_notes, '')), 500), ''),
    attending_dot       = not v_declined and coalesce(p_attending_dot, false),
    attending_civil     = not v_declined and coalesce(p_attending_civil, false),
    attending_church    = not v_declined and coalesce(p_attending_church, false),
    attending_reception = not v_declined and coalesce(p_attending_reception, false)
  where id = p_guest_id and marriage_id = p_marriage_id;

  return found;
end;
$$;

revoke all on function public.submit_rsvp(uuid, uuid, text, text, boolean, boolean, boolean, boolean) from public;
grant execute on function public.submit_rsvp(uuid, uuid, text, text, boolean, boolean, boolean, boolean) to anon, authenticated;
