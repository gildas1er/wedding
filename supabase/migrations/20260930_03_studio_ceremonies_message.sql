-- =====================================================================
-- MIGRATION 3 — Studio : cérémonies activables et message WhatsApp personnalisé.
-- Sans risque (ajouts uniquement), à exécuter avant ou après le déploiement :
-- tant qu'elle n'est pas lancée, l'app garde le comportement actuel.
-- =====================================================================

-- NULL = pas de choix explicite : l'app déduit (mairie et réception prévues,
-- église seulement si une date ou une heure est renseignée).
alter table public.marriages add column if not exists show_civil boolean;
alter table public.marriages add column if not exists show_religious boolean;
alter table public.marriages add column if not exists show_reception boolean;

-- Modèle du message WhatsApp ({prenom}, {maries}, {lien}). NULL = message par défaut.
alter table public.marriages add column if not exists whatsapp_message text;

-- La page RSVP a besoin de savoir quelles cérémonies afficher
create or replace function public.get_rsvp_invitation(p_marriage_id uuid, p_guest_id uuid default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'marriage', (
      select to_jsonb(m) from (
        select id, partner_1_name, partner_2_name, wedding_date,
               primary_color, invitation_text, bg_image_url, music_url,
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
