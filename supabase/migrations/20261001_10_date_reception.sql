-- =====================================================================
-- MIGRATION 10 — Date de la réception & dîner (comme la mairie et l'église).
-- Sans risque (ajout uniquement). À lancer après la migration 6.
-- Vide = la réception a lieu le jour du mariage.
-- =====================================================================

alter table public.marriages add column if not exists reception_date date;

-- La page RSVP a besoin de la date de la réception
create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date,
               primary_color, accent_color, invitation_text, bg_image_url, bg_image_position, music_url,
               show_civil, show_religious, show_reception, practical_info,
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
               attending_civil, attending_church, attending_reception
        from public.invite
        where id = p_guest_id and marriage_id = p_marriage_id
      ) g
    )
  );
$$;
