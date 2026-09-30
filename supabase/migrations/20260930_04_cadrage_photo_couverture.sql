-- =====================================================================
-- MIGRATION 4 — Cadrage de la photo de couverture.
-- Sans risque (ajout uniquement). À lancer après la migration 3.
-- Tant qu'elle n'est pas lancée, la photo reste centrée.
-- =====================================================================

-- Point de cadrage au format CSS "x% y%" (ex. "50% 30%"). NULL = centré.
alter table public.marriages add column if not exists bg_image_position text;

do $$ begin
  alter table public.marriages add constraint marriages_bg_image_position_check
    check (bg_image_position is null or bg_image_position ~ '^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$');
exception when duplicate_object then null; end $$;

-- La page RSVP a besoin du cadrage
create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date,
               primary_color, invitation_text, bg_image_url, bg_image_position, music_url,
               show_civil, show_religious, show_reception,
               mairie_date, mairie_hour, mairie_location, mairie_maps_url,
               religious_date, religious_hour, religious_location, religious_maps_url,
               reception_hour, reception_location, reception_maps_url
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
