-- =====================================================================
-- MIGRATION 28 — Code de parrainage du couple sur la page d'invitation.
-- Après le mariage, la page propose aux invités 5 000 F de réduction « offerts par les mariés »
-- (leur code de parrainage) et un message à transférer à des fiancés. Le code est fait pour être
-- partagé : il rejoint les informations publiques de l'invitation, rien d'autre ne change.
-- À lancer après la migration 19 (codes promo et parrainage). Sans risque. Relançable.
-- =====================================================================

create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date, public.marriage_space_phase(id) as space_phase,
               primary_color, accent_color, invitation_template, names_font, invitation_text, bg_image_url, bg_image_position, music_url,
               show_dot, show_civil, show_religious, show_reception, practical_info,
               dot_date, dot_hour, dot_location, dot_maps_url,
               mairie_date, mairie_hour, mairie_location, mairie_maps_url,
               religious_date, religious_hour, religious_location, religious_maps_url,
               reception_date, reception_hour, reception_location, reception_maps_url,
               referral_code
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
