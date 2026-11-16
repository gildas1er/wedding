-- =====================================================================
-- MIGRATION 37 — Invitations au style africain (Le Pagne, Le Kita, Le Bogolan, Le Village)
--   1. Quatre modèles de plus autorisés : « pagne », « kita », « bogolan », « village ».
--   2. Les familles qui invitent (« Les familles Kouassi & Yao ont la joie de vous convier… »).
--   3. La tenue : pagne de la cérémonie, tenue traditionnelle ou couleurs imposées.
--   4. Le pagne de la cérémonie : photo, nom, prix, personne à contacter sur WhatsApp.
--   Ces informations rejoignent la page d'invitation publique (get_rsvp_invitation).
--   Sans risque (ajouts uniquement, les choix existants restent valides). Relançable. À lancer après la 36.
-- =====================================================================

-- 1. Modèles autorisés
alter table public.marriages drop constraint if exists marriages_invitation_template_check;
alter table public.marriages add constraint marriages_invitation_template_check
  check (invitation_template in ('classique', 'enveloppe', 'wax', 'story', 'compte_a_rebours', 'jardin', 'nuit_doree', 'avant_premiere',
                                 'pagne', 'kita', 'bogolan', 'village'));

-- 2 à 4. Familles, tenue et pagne
alter table public.marriages add column if not exists family_1 text;
alter table public.marriages add column if not exists family_2 text;
alter table public.marriages add column if not exists dress_code text;
alter table public.marriages add column if not exists dress_colors jsonb not null default '[]'::jsonb;
alter table public.marriages add column if not exists ceremony_pagne jsonb;

alter table public.marriages drop constraint if exists marriages_family_1_check;
alter table public.marriages add constraint marriages_family_1_check check (family_1 is null or char_length(family_1) <= 60);
alter table public.marriages drop constraint if exists marriages_family_2_check;
alter table public.marriages add constraint marriages_family_2_check check (family_2 is null or char_length(family_2) <= 60);
alter table public.marriages drop constraint if exists marriages_dress_code_check;
alter table public.marriages add constraint marriages_dress_code_check check (dress_code is null or dress_code in ('pagne', 'traditionnel', 'couleurs'));
alter table public.marriages drop constraint if exists marriages_dress_colors_check;
alter table public.marriages add constraint marriages_dress_colors_check
  check (jsonb_typeof(dress_colors) = 'array' and jsonb_array_length(dress_colors) <= 5 and length(dress_colors::text) <= 200);
alter table public.marriages drop constraint if exists marriages_ceremony_pagne_check;
alter table public.marriages add constraint marriages_ceremony_pagne_check
  check (ceremony_pagne is null or (jsonb_typeof(ceremony_pagne) = 'object' and length(ceremony_pagne::text) <= 2000));

-- Page d'invitation publique : mêmes informations que la migration 28, plus les nouvelles
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
               referral_code,
               family_1, family_2, dress_code, dress_colors, ceremony_pagne
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
