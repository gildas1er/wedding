-- =====================================================================
-- MIGRATION 16 — Police d'écriture des prénoms des mariés sur l'invitation.
-- Sans risque (ajout uniquement). À lancer après la migration 15.
-- =====================================================================

alter table public.marriages add column if not exists names_font text;

do $$ begin
  alter table public.marriages add constraint marriages_names_font_check
    check (names_font is null or names_font in ('classique', 'great_vibes', 'alex_brush', 'monsieur_la_doulaise', 'parisienne', 'pinyon_script'));
exception when duplicate_object then null; end $$;

-- La page RSVP a besoin de la police (reprend les colonnes des migrations précédentes)
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
