-- =====================================================================
-- MIGRATION 6 — Rubriques pratiques de l'invitation (dress code, contact, hébergement…).
-- Sans risque (ajout uniquement). À lancer après les migrations 3, 4 et 5.
-- Tant qu'elle n'est pas lancée, l'invitation n'affiche pas de rubriques.
-- =====================================================================

-- Liste ordonnée de rubriques : [{ id, kind, title, text, name?, phone?, url?, colors? }, …]
alter table public.marriages add column if not exists practical_info jsonb;

do $$ begin
  alter table public.marriages add constraint marriages_practical_info_check
    check (
      practical_info is null
      or (jsonb_typeof(practical_info) = 'array'
          and jsonb_array_length(practical_info) <= 12
          and pg_column_size(practical_info) < 32000)
    );
exception when duplicate_object then null; end $$;

-- La page RSVP a besoin des rubriques (reprend aussi les colonnes des migrations 3 à 5)
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
